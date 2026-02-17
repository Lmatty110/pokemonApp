// src/api.js
import axios from "axios";
import { API } from "./App"; // oppure "./config" se preferisci

const api = axios.create({
  baseURL: API, // Usa l'URL centrale
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: aggiungi interceptor per token o error handling
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // esempio
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
