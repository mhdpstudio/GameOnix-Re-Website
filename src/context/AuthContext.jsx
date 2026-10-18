import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  authFetch,
  clearSessionToken,
  storeSessionToken,
} from "../api/session";

const API_URL = "https://gameonix-backend.vercel.app/api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore the signed-in user when the app starts.
  const refreshUser = useCallback(async () => {
    setAuthLoading(true);

    try {
      const response = await authFetch(`${API_URL}/me`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        // Do not immediately delete a saved token.
        // The user is not authenticated for this request.
        setUser(null);
        return null;
      }

      if (!response.ok) {
        throw new Error(
          `Unable to restore the session (${response.status}).`
        );
      }

      const data = await response.json();
      const currentUser = data.user || null;

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error("Session restore failed:", error);
      // Keep the saved token so a temporary network error
      // does not erase the user's local session.
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Sign in and store the token according to "Remember me".
  const login = useCallback(
    (userData, sessionToken, rememberMe = true) => {
      if (sessionToken) {
        storeSessionToken(sessionToken, rememberMe);
      }

      setUser(userData || null);
    },
    []
  );

  // Sign out from the backend and clear the local session.
  const logout = useCallback(async () => {
    try {
      const response = await authFetch(`${API_URL}/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Unable to sign out.");
      }
    } finally {
      // Clear local state even if the logout request fails.
      clearSessionToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = {
    user,
    setUser,
    authLoading,
    refreshUser,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}