"""Isolated regression tests: real models/route bodies, fake MongoDB and push transport.

Run with: python -m unittest discover -s backend/tests -p test_news_notes_push.py -v
Requires pydantic and pywebpush from backend/requirements.txt; no database or devices.
"""
import ast
import asyncio
import base64
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from types import SimpleNamespace
from typing import List, Optional
import unittest
from unittest.mock import AsyncMock, Mock
from urllib.parse import urlparse
import uuid

from pydantic import BaseModel, Field, ValidationError, field_validator
from pywebpush import WebPushException


class HTTPException(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        super().__init__(detail)


def load_routes(db):
    names = {"NewsCreate", "NewsItem", "NewsVisibilityUpdate", "LearnedMove", "HeldItem", "ProfileUpdate", "update_profile",
             "PokemonUpdate", "PushKeys", "PushSubscriptionCreate", "PushSubscriptionDelete",
             "validate_push_endpoint", "push_is_configured", "get_push_config", "subscribe_push",
             "unsubscribe_push", "send_news_notifications", "create_news_admin", "create_news",
             "get_all_news_admin", "get_news", "get_news_detail", "set_news_visibility", "update_my_pokemon"}
    tree = ast.parse((Path(__file__).parents[1] / "server.py").read_text(encoding="utf-8"))
    nodes = [node for node in tree.body if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
    for node in nodes:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            node.decorator_list = []
            node.args.defaults = []
            for argument in node.args.args:
                argument.annotation = None
    namespace = {"db": db, "HTTPException": HTTPException, "BaseModel": BaseModel, "Field": Field,
                 "field_validator": field_validator, "List": List, "Optional": Optional,
                 "base64": base64, "urlparse": urlparse, "asyncio": asyncio, "json": json,
                 "logger": logging.getLogger(__name__), "uuid": uuid, "datetime": datetime, "timezone": timezone,
                 "VAPID_PUBLIC_KEY": "public", "VAPID_PRIVATE_KEY": "private", "VAPID_SUBJECT": "mailto:test@example.com",
                 "webpush": Mock(), "WebPushException": WebPushException}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "server.py", "exec"), namespace)
    return namespace


class Cursor:
    def __init__(self, documents):
        self.documents = list(documents)

    def sort(self, fields):
        for field, direction in reversed(fields):
            self.documents.sort(key=lambda item: item[field], reverse=direction < 0)
        return self

    async def to_list(self, limit):
        return self.documents[:limit]

    def __aiter__(self):
        async def iterate():
            for item in self.documents:
                yield item
        return iterate()


class NewsNotesPushTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.db = SimpleNamespace(
            user_profiles=SimpleNamespace(update_one=AsyncMock()),
            news=SimpleNamespace(find=Mock(), find_one=AsyncMock(), update_one=AsyncMock(), insert_one=AsyncMock()),
            user_pokemon=SimpleNamespace(find_one=AsyncMock(), update_one=AsyncMock()),
            push_subscriptions=SimpleNamespace(find=Mock(), find_one=AsyncMock(return_value={"_id": "device"}), update_one=AsyncMock(), delete_one=AsyncMock()),
            users=SimpleNamespace(find_one=AsyncMock(return_value={"id": "trainer"})))
        self.routes = load_routes(self.db)
        self.user = {"id": "trainer"}
        self.documents = [self.news("older", "2026-10-01"), self.news("newer", "2026-10-09"),
                          {**self.news("hidden", "2026-10-08"), "is_active": False}]
        self.db.news.find.side_effect = lambda query, projection: Cursor(
            item for item in self.documents if all(item.get(key) == value for key, value in query.items()))
        self.background = SimpleNamespace(add_task=Mock())

    @staticmethod
    def news(identifier, date):
        return {"id": identifier, "created_at": date, "title": identifier, "description": "Details",
                "news_type": "announcement", "is_active": True, "size": "normal"}

    def subscription(self, endpoint="https://fcm.googleapis.com/fcm/send/device"):
        encode = lambda data: base64.urlsafe_b64encode(data).decode().rstrip("=")
        return self.routes["PushSubscriptionCreate"](endpoint=endpoint,
            keys={"p256dh": encode(b"\x04" + b"x" * 64), "auth": encode(b"x" * 16)})

    async def test_news_newest_first_and_hidden_excluded(self):
        result = await self.routes["get_news"](self.user)
        self.assertEqual([item["id"] for item in result], ["newer", "older"])

    async def test_admin_sees_hidden_news_in_date_order(self):
        result = await self.routes["get_all_news_admin"]({"id": "admin"})
        self.assertEqual([item["id"] for item in result], ["newer", "hidden", "older"])

    async def test_hiding_all_news_does_not_recreate_questionnaire(self):
        for item in self.documents:
            item["is_active"] = False
        self.db.news.find_one.return_value = {"_id": "existing"}
        self.assertEqual(await self.routes["get_news"](self.user), [])
        self.db.news.insert_one.assert_not_awaited()
        self.db.news.update_one.assert_not_awaited()

    async def test_visibility_can_be_disabled_and_enabled_without_push(self):
        self.db.news.update_one.return_value = SimpleNamespace(matched_count=1)
        for visible in (False, True):
            await self.routes["set_news_visibility"]("existing", self.routes["NewsVisibilityUpdate"](is_active=visible), {})
            self.db.news.update_one.assert_awaited_with({"id": "existing"}, {"$set": {"is_active": visible}})
        self.routes["webpush"].assert_not_called()

    async def test_missing_news_visibility_returns_404(self):
        self.db.news.update_one.return_value = SimpleNamespace(matched_count=0)
        with self.assertRaises(HTTPException) as error:
            await self.routes["set_news_visibility"]("missing", self.routes["NewsVisibilityUpdate"](is_active=False), {})
        self.assertEqual(error.exception.status_code, 404)

    async def test_hidden_detail_returns_404(self):
        self.db.news.find_one.return_value = None
        with self.assertRaises(HTTPException) as error:
            await self.routes["get_news_detail"]("hidden", self.user)
        self.assertEqual(error.exception.status_code, 404)
        self.db.news.find_one.assert_awaited_with({"id": "hidden", "is_active": True}, {"_id": 0})

    async def test_notifications_are_opt_in_per_new_news(self):
        for notify in (False, True):
            data = self.routes["NewsCreate"](title="New", description="Body", news_type="event", send_notification=notify)
            self.background.add_task.reset_mock()
            result = await self.routes["create_news_admin"](data, self.background, {})
            self.assertEqual(result.notification_requested, notify)
            self.assertEqual(self.background.add_task.call_count, int(notify))
        self.assertFalse(self.routes["NewsCreate"](title="New", description="Body", news_type="event").send_notification)

    async def test_unconfigured_push_rejects_before_creating_news(self):
        self.routes["VAPID_PRIVATE_KEY"] = ""
        data = self.routes["NewsCreate"](title="New", description="Body", news_type="event", send_notification=True)
        with self.assertRaises(HTTPException) as error:
            await self.routes["create_news_admin"](data, self.background, {})
        self.assertEqual(error.exception.status_code, 503)
        self.db.news.insert_one.assert_not_awaited()

    async def test_notes_save_clear_and_remain_scoped_to_owner(self):
        self.db.user_pokemon.update_one.return_value = SimpleNamespace(matched_count=1)
        for notes, expected in [("Prima riga\nSeconda riga 📝", "Prima riga\nSeconda riga 📝"), ("", ""), (None, "")]:
            await self.routes["update_my_pokemon"](25, self.routes["PokemonUpdate"](notes=notes), self.user)
            self.db.user_pokemon.update_one.assert_awaited_with(
                {"user_id": "trainer", "pokemon_id": 25}, {"$set": {"notes": expected}})
        with self.assertRaises(ValidationError):
            self.routes["PokemonUpdate"](notes="x" * 5001)

    async def test_notes_cannot_be_written_to_unowned_pokemon(self):
        self.db.user_pokemon.update_one.return_value = SimpleNamespace(matched_count=0)
        with self.assertRaises(HTTPException) as error:
            await self.routes["update_my_pokemon"](25, self.routes["PokemonUpdate"](notes="test"), self.user)
        self.assertEqual(error.exception.status_code, 404)

    async def test_unrelated_update_preserves_notes(self):
        self.db.user_pokemon.update_one.return_value = SimpleNamespace(matched_count=1)
        await self.routes["update_my_pokemon"](25, self.routes["PokemonUpdate"](nickname="Spark"), self.user)
        self.assertEqual(self.db.user_pokemon.update_one.call_args.args[1], {"$set": {"nickname": "Spark"}})

    async def test_devices_register_separately_and_unsubscribe_only_current_owner(self):
        for endpoint in ("https://fcm.googleapis.com/fcm/send/device1", "https://web.push.apple.com/device2"):
            subscription = self.subscription(endpoint)
            await self.routes["subscribe_push"](subscription, self.user)
            self.assertEqual(self.db.push_subscriptions.update_one.call_args.args[0], {"endpoint": endpoint})
            self.assertEqual(self.db.push_subscriptions.update_one.call_args.args[1]["$set"]["user_id"], "trainer")
        await self.routes["unsubscribe_push"](self.routes["PushSubscriptionDelete"](endpoint="device1"), self.user)
        self.db.push_subscriptions.delete_one.assert_awaited_with({"endpoint": "device1", "user_id": "trainer"})

    def test_subscription_validation_rejects_arbitrary_servers_and_bad_keys(self):
        for endpoint in ("http://fcm.googleapis.com/a", "https://localhost/a", "https://127.0.0.1/a",
                         "https://fcm.googleapis.com.evil.test/a", "https://fcm.googleapis.com:8000/a",
                         "https://user:password@fcm.googleapis.com/a"):
            with self.subTest(endpoint=endpoint), self.assertRaises(ValidationError):
                self.subscription(endpoint)
        with self.assertRaises(ValidationError):
            self.routes["PushKeys"](p256dh="invalid", auth="invalid")

    async def test_push_sends_to_all_devices_and_removes_expired_endpoints(self):
        subscriptions = [{"user_id": "trainer", **self.subscription(f"https://fcm.googleapis.com/fcm/send/{index}").model_dump()} for index in range(3)]
        self.db.push_subscriptions.find.return_value = Cursor(subscriptions)
        expired = WebPushException("expired", response=SimpleNamespace(status_code=410))
        self.routes["webpush"].side_effect = [None, expired, None]
        await self.routes["send_news_notifications"](self.news("newer", "2026-10-09"))
        self.assertEqual(self.routes["webpush"].call_count, 3)
        self.assertEqual(self.db.push_subscriptions.delete_one.await_count, 1)
        for call in self.routes["webpush"].call_args_list:
            self.assertEqual(json.loads(call.kwargs["data"])["url"], "/news/newer")
            self.assertEqual(call.kwargs["ttl"], 86400)

    async def test_deleted_accounts_do_not_receive_push(self):
        self.db.users.find_one.return_value = None
        self.db.push_subscriptions.find.return_value = Cursor([{"user_id": "deleted", **self.subscription().model_dump()}])
        await self.routes["send_news_notifications"](self.news("newer", "2026-10-09"))
        self.routes["webpush"].assert_not_called()
        self.db.push_subscriptions.delete_one.assert_awaited_once()

    async def test_unsubscribed_devices_do_not_receive_pending_push(self):
        self.db.push_subscriptions.find_one.return_value = None
        self.db.push_subscriptions.find.return_value = Cursor([{"user_id": "trainer", **self.subscription().model_dump()}])
        await self.routes["send_news_notifications"](self.news("newer", "2026-10-09"))
        self.routes["webpush"].assert_not_called()

    async def test_nickname_and_level_can_be_saved_and_cleared(self):
        self.db.user_pokemon.update_one.return_value = SimpleNamespace(matched_count=1)
        for values in [{"nickname": "Sparky", "level": 25}, {"nickname": None, "level": None}]:
            await self.routes["update_my_pokemon"](25, self.routes["PokemonUpdate"](**values), self.user)
            self.db.user_pokemon.update_one.assert_awaited_with(
                {"user_id": "trainer", "pokemon_id": 25}, {"$set": values})

    def test_level_validation_rejects_invalid_values_and_non_integers(self):
        for level in [0, 101, -1, 12.5, "25", True]:
            with self.subTest(level=level), self.assertRaises(ValidationError):
                self.routes["PokemonUpdate"](level=level)

    def test_nickname_length_is_limited(self):
        self.assertEqual(self.routes["PokemonUpdate"](nickname="x" * 50).nickname, "x" * 50)
        with self.assertRaises(ValidationError):
            self.routes["PokemonUpdate"](nickname="x" * 51)

    async def test_partial_profile_autosave_preserves_other_fields(self):
        await self.routes["update_profile"](self.routes["ProfileUpdate"](savings="12.345"), self.user)
        query, update = self.db.user_profiles.update_one.call_args.args
        self.assertEqual(query, {"user_id": "trainer"})
        self.assertEqual(set(update["$set"]), {"savings", "updated_at"})
        self.assertEqual(update["$set"]["savings"], "12.345")

    async def test_profile_photo_can_be_cleared_without_clearing_stats(self):
        await self.routes["update_profile"](self.routes["ProfileUpdate"](profile_image=None), self.user)
        self.assertEqual(set(self.db.user_profiles.update_one.call_args.args[1]["$set"]), {"profile_image", "updated_at"})
        self.assertIsNone(self.db.user_profiles.update_one.call_args.args[1]["$set"]["profile_image"])


if __name__ == "__main__":
    unittest.main()
