import { authFetch } from "./session";

const API_URL = "https://gameonix-backend.vercel.app/api/auth/favorites";

async function request(method, body) {
  const response = await authFetch(API_URL, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Favorites request failed.");
  }

  return data;
}

export function getFavorites() {
  return request("GET");
}

export function addFavorite(slug) {
  return request("POST", { slug });
}

export function removeFavorite(slug) {
  return request("DELETE", { slug });
}