const SESSION_TOKEN_KEY = "gameonix_session_token";
const COMMUNITY_AUTH_ME_URL =
  "https://gameonix-backend.vercel.app/api/auth/me";

export async function getCommunityApiToken() {
  const response = await fetch(`${COMMUNITY_AUTH_ME_URL}?token=true`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || typeof data.token !== "string") {
    throw new Error(data.error || "Your session expired. Sign in again.");
  }

  return data.token;
}

export function getSessionToken() {
  return (
    localStorage.getItem(SESSION_TOKEN_KEY) ||
    sessionStorage.getItem(SESSION_TOKEN_KEY)
  );
}

export function storeSessionToken(token, rememberMe = true) {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);

  if (rememberMe) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
}

export function authFetch(input, options = {}) {
  const headers = new Headers(options.headers);
  const token = getSessionToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...options,
    credentials: "include",
    headers,
  });
}
