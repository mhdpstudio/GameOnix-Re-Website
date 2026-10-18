const SESSION_TOKEN_KEY = "gameonix_session_token";

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
