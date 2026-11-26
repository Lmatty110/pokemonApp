"""Isolated route logic tests; no running MongoDB or external API required.

Load route bodies without application startup so these tests also run with
the standard library alone. Deployment integration is outside this suite.
"""
import ast
import asyncio
import io
import json
import logging
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, Mock
from urllib.request import Request


class HTTPException(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        super().__init__(detail)


def load_routes(db):
    tree = ast.parse((Path(__file__).parents[1] / "server.py").read_text(encoding="utf-8"))
    names = {"fetch_pokeapi", "evolution_options", "mapped_evolution_ability", "evolve_pokemon", "get_evolutions", "set_admin_inventory", "update_my_pokemon"}
    functions = [node for node in tree.body if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)) and node.name in names]
    for node in functions:
        node.decorator_list = []
        node.args.defaults = []
        for argument in node.args.args:
            argument.annotation = None
    namespace = {"db": db, "HTTPException": HTTPException, "asyncio": asyncio,
                 "json": json, "Request": Request, "logger": logging.getLogger(__name__)}
    exec(compile(ast.Module(body=functions, type_ignores=[]), "server.py", "exec"), namespace)
    return namespace


class InventoryEvolutionTests(unittest.IsolatedAsyncioTestCase):
    async def test_pokeapi_request_uses_explicit_headers(self):
        routes = load_routes(SimpleNamespace())
        opener = Mock(return_value=io.BytesIO(b'{"id": 25}'))
        routes["urlopen"] = opener
        self.assertEqual(await routes["fetch_pokeapi"]("pokemon/25"), {"id": 25})
        request = opener.call_args.args[0]
        self.assertEqual(request.full_url, "https://pokeapi.co/api/v2/pokemon/25/")
        self.assertEqual(request.get_header("Accept"), "application/json")
        self.assertTrue(request.get_header("User-agent").startswith("PokemonAcademy/"))
        self.assertEqual(opener.call_args.kwargs["timeout"], 15)

    def setUp(self):
        self.collection = SimpleNamespace(find_one=AsyncMock(), update_one=AsyncMock(), delete_one=AsyncMock())
        self.routes = load_routes(SimpleNamespace(user_pokemon=self.collection, user_inventory=self.collection))
        self.target = {"pokemon_id": 26, "pokemon_name": "raichu"}
        self.routes["evolution_options"] = AsyncMock(return_value=[self.target])

    async def test_evolve_preserves_all_other_fields(self):
        owned = {"id": "record", "user_id": "trainer", "pokemon_id": 25, "pokemon_name": "pikachu",
                 "level": 42, "nickname": "Spark", "learned_moves": [{"name": "Thunder"}, None],
                 "held_item": {"name": "berry"}, "assigned_at": "original"}
        self.collection.find_one.side_effect = [owned, None, {**owned, **self.target}]
        self.collection.update_one.return_value = SimpleNamespace(matched_count=1)
        result = await self.routes["evolve_pokemon"](25, SimpleNamespace(pokemon_id=26), {"id": "trainer"})
        self.assertEqual(result, {**owned, **self.target})
        self.collection.update_one.assert_awaited_once_with(
            {"user_id": "trainer", "pokemon_id": 25, "id": "record"}, {"$set": self.target})

    async def test_unowned_pokemon_cannot_evolve(self):
        self.collection.find_one.return_value = None
        with self.assertRaises(HTTPException) as error:
            await self.routes["evolve_pokemon"](25, SimpleNamespace(pokemon_id=26), {"id": "other"})
        self.assertEqual(error.exception.status_code, 404)
        self.collection.update_one.assert_not_awaited()

    async def test_invalid_or_duplicate_evolution_is_rejected(self):
        for target, existing, status in [(6, None, 400), (26, {"id": "other"}, 409)]:
            self.collection.find_one.side_effect = [{"id": "record"}, existing]
            with self.assertRaises(HTTPException) as error:
                await self.routes["evolve_pokemon"](25, SimpleNamespace(pokemon_id=target), {"id": "trainer"})
            self.assertEqual(error.exception.status_code, status)
        self.collection.update_one.assert_not_awaited()

    async def test_inventory_exact_quantity_and_removal_are_scoped(self):
        self.collection.update_one.return_value = SimpleNamespace(matched_count=1)
        self.collection.delete_one.return_value = SimpleNamespace(deleted_count=1)
        await self.routes["set_admin_inventory"]("trainer", "potion", SimpleNamespace(quantity=75), {})
        self.collection.update_one.assert_awaited_once_with(
            {"user_id": "trainer", "name": "potion"}, {"$set": {"quantity": 75}})
        result = await self.routes["set_admin_inventory"]("trainer", "potion", SimpleNamespace(quantity=0), {})
        self.assertEqual(result, {"removed": True})
        self.collection.delete_one.assert_awaited_once_with({"user_id": "trainer", "name": "potion"})

    async def test_missing_inventory_item_returns_404(self):
        self.collection.update_one.return_value = SimpleNamespace(matched_count=0)
        with self.assertRaises(HTTPException) as error:
            await self.routes["set_admin_inventory"]("trainer", "potion", SimpleNamespace(quantity=1), {})
        self.assertEqual(error.exception.status_code, 404)

    async def test_ability_assignment_and_removal(self):
        self.routes["fetch_pokeapi"] = AsyncMock(return_value={"abilities": [
            {"ability": {"name": "static"}, "is_hidden": False},
            {"ability": {"name": "lightning-rod"}, "is_hidden": True}]})
        self.collection.update_one.return_value = SimpleNamespace(matched_count=1)
        for ability in ["static", "lightning-rod", None]:
            update = SimpleNamespace(nickname=None, level=None, learned_moves=None,
                                     model_fields_set={"ability"}, ability=ability)
            await self.routes["update_my_pokemon"](25, update, {"id": "trainer"})
            self.collection.update_one.assert_awaited_with(
                {"user_id": "trainer", "pokemon_id": 25}, {"$set": {"ability": ability}})
        self.assertEqual(self.routes["fetch_pokeapi"].await_count, 2)

    async def test_incompatible_ability_cannot_be_saved(self):
        self.routes["fetch_pokeapi"] = AsyncMock(return_value={"abilities": []})
        update = SimpleNamespace(nickname=None, level=None, learned_moves=None,
                                 model_fields_set={"ability"}, ability="overgrow")
        with self.assertRaises(HTTPException) as error:
            await self.routes["update_my_pokemon"](25, update, {"id": "trainer"})
        self.assertEqual(error.exception.status_code, 400)
        self.collection.update_one.assert_not_awaited()

    async def test_other_updates_leave_ability_unchanged(self):
        self.routes["fetch_pokeapi"] = AsyncMock()
        self.collection.update_one.return_value = SimpleNamespace(matched_count=1)
        update = SimpleNamespace(nickname="Spark", level=None, learned_moves=None,
                                 model_fields_set={"nickname"}, ability=None)
        await self.routes["update_my_pokemon"](25, update, {"id": "trainer"})
        self.assertEqual(self.collection.update_one.call_args.args[1], {"$set": {"nickname": "Spark"}})
        self.routes["fetch_pokeapi"].assert_not_awaited()

    async def test_evolution_maps_ability_by_slot(self):
        self.collection.find_one.side_effect = [{"id": "record", "ability": "static"}, None, {}]
        self.collection.update_one.return_value = SimpleNamespace(matched_count=1)
        self.routes["fetch_pokeapi"] = AsyncMock(side_effect=[
            {"abilities": [{"ability": {"name": "static"}, "slot": 1}]},
            {"abilities": [{"ability": {"name": "surge-surfer"}, "slot": 1},
                           {"ability": {"name": "lightning-rod"}, "slot": 3}]},
        ])
        await self.routes["evolve_pokemon"](25, SimpleNamespace(pokemon_id=26, ability=None), {"id": "trainer"})
        self.assertEqual(self.collection.update_one.call_args.args[1]["$set"]["ability"], "surge-surfer")

    async def test_evolution_requires_choice_when_slot_is_missing(self):
        self.collection.find_one.side_effect = [{"id": "record", "ability": "static"}, None]
        self.routes["fetch_pokeapi"] = AsyncMock(side_effect=[
            {"abilities": [{"ability": {"name": "static"}, "slot": 2}]},
            {"abilities": [{"ability": {"name": "surge-surfer"}, "slot": 1}]},
        ])
        with self.assertRaises(HTTPException) as error:
            await self.routes["evolve_pokemon"](25, SimpleNamespace(pokemon_id=26, ability=None), {"id": "trainer"})
        self.assertEqual(error.exception.status_code, 400)
        self.collection.update_one.assert_not_awaited()

    async def test_evolution_accepts_valid_choice_when_slot_is_missing(self):
        self.collection.find_one.side_effect = [{"id": "record", "ability": "static"}, None, {}]
        self.collection.update_one.return_value = SimpleNamespace(matched_count=1)
        self.routes["fetch_pokeapi"] = AsyncMock(side_effect=[
            {"abilities": [{"ability": {"name": "static"}, "slot": 2}]},
            {"abilities": [{"ability": {"name": "surge-surfer"}, "slot": 1}]},
        ])
        await self.routes["evolve_pokemon"](25, SimpleNamespace(pokemon_id=26, ability="surge-surfer"), {"id": "trainer"})
        self.assertEqual(self.collection.update_one.call_args.args[1]["$set"]["ability"], "surge-surfer")

    async def test_evolution_options_include_ability_mapping_and_choices(self):
        self.collection.find_one.return_value = {"ability": "static"}
        self.routes["fetch_pokeapi"] = AsyncMock(side_effect=[
            {"abilities": [{"ability": {"name": "static"}, "slot": 1}]},
            {"abilities": [{"ability": {"name": "surge-surfer"}, "slot": 1},
                           {"ability": {"name": "lightning-rod"}, "slot": 3}]},
        ])
        options = await self.routes["get_evolutions"](25, {"id": "trainer"})
        self.assertEqual(options[0]["suggested_ability"], "surge-surfer")
        self.assertEqual(options[0]["ability_options"], ["surge-surfer", "lightning-rod"])

    async def test_only_immediate_evolutions_and_branches(self):
        def node(name, number, children=None):
            return {"species": {"name": name, "url": f"https://pokeapi.co/api/v2/pokemon-species/{number}/"}, "evolves_to": children or []}
        chain = node("pichu", 172, [node("pikachu", 25, [node("raichu", 26)])])
        routes = load_routes(SimpleNamespace())
        async def options(name, number):
            routes["fetch_pokeapi"] = AsyncMock(side_effect=[
                {"species": {"url": f"https://pokeapi.co/api/v2/pokemon-species/{number}/"}},
                {"name": name, "evolution_chain": {"url": "https://pokeapi.co/api/v2/evolution-chain/10/"}},
                {"chain": chain}])
            return await routes["evolution_options"](number)
        self.assertEqual(await options("pikachu", 25), [self.target])
        self.assertEqual(await options("raichu", 26), [])
        chain = node("eevee", 133, [node("vaporeon", 134), node("jolteon", 135)])
        self.assertEqual([item["pokemon_id"] for item in await options("eevee", 133)], [134, 135])

    async def test_regional_evolution_keeps_regional_variety(self):
        def species(name, number, children=None):
            return {"species": {"name": name, "url": f"https://pokeapi.co/api/v2/pokemon-species/{number}/"},
                    "evolves_to": children or []}
        chain = species("zigzagoon", 263, [species("linoone", 264)])
        routes = load_routes(SimpleNamespace())
        routes["fetch_pokeapi"] = AsyncMock(side_effect=[
            {"name": "zigzagoon-galar", "species": {"url": "https://pokeapi.co/api/v2/pokemon-species/263/"}},
            {"name": "zigzagoon", "evolution_chain": {"url": "https://pokeapi.co/api/v2/evolution-chain/1/"}},
            {"chain": chain},
            {"varieties": [{"pokemon": {"name": "linoone", "url": "https://pokeapi.co/api/v2/pokemon/264/"}},
                           {"pokemon": {"name": "linoone-galar", "url": "https://pokeapi.co/api/v2/pokemon/10180/"}}]},
        ])
        self.assertEqual(await routes["evolution_options"](10172),
                         [{"pokemon_id": 10180, "pokemon_name": "linoone-galar"}])

    async def test_regional_branch_prefers_species_introduced_with_region(self):
        def species(name, number, children=None):
            return {"species": {"name": name, "url": f"https://pokeapi.co/api/v2/pokemon-species/{number}/"},
                    "evolves_to": children or []}
        chain = species("wooper", 194, [species("quagsire", 195), species("clodsire", 980)])
        routes = load_routes(SimpleNamespace())
        routes["fetch_pokeapi"] = AsyncMock(side_effect=[
            {"name": "wooper-paldea", "species": {"url": "https://pokeapi.co/api/v2/pokemon-species/194/"}},
            {"name": "wooper", "evolution_chain": {"url": "https://pokeapi.co/api/v2/evolution-chain/1/"}},
            {"chain": chain},
            {"varieties": [], "generation": {"name": "generation-ii"}},
            {"varieties": [], "generation": {"name": "generation-ix"}},
        ])
        self.assertEqual(await routes["evolution_options"](10253),
                         [{"pokemon_id": 980, "pokemon_name": "clodsire"}])


if __name__ == "__main__":
    unittest.main()
