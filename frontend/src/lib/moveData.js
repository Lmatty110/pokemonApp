import axios from "axios";

const moves = new Map();

// Share both completed and in-flight requests across lists and saved moves.
export function getMoveData(name) {
  if (!name) return Promise.reject(new Error("Mossa non disponibile"));
  if (!moves.has(name)) {
    const request = axios.get(`https://pokeapi.co/api/v2/move/${encodeURIComponent(name)}/`, { timeout: 15000 })
      .then(response => response.data)
      .catch(error => { moves.delete(name); throw error; });
    moves.set(name, request);
  }
  return moves.get(name);
}
