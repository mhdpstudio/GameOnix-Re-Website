
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_URL = "https://gameonix-backend.vercel.app/api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore the signed-in user when the app starts.
  const refreshUser = useCallback(async () => {
    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        setUser(null);
        return null;
      }

      if (!response.ok) {
        throw new Error("Unable to restore the session.");
      }

      const data = await response.json();
      const currentUser = data.user || null;

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error("Session restore failed:", error);
      setUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  // Sign out and update the Sidebar immediately.
  const logout = useCallback(async () => {
    const response = await fetch(`${API_URL}/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Unable to sign out.");
    }

    // React updates every component using useAuth().
    // No page reload is required.
    setUser(null);
  }, []);

  // Update the current user after login or email verification.
  const login = useCallback((userData) => {
    setUser(userData || null);
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
