import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loginWithGoogle, logout, onAuth } from "../firebase";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuth((firebaseUser) => {
      setUser(firebaseUser || null);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = useCallback(async () => {
    try { await loginWithGoogle(); } catch (e) { console.error("Login failed:", e); }
  }, []);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch (e) { console.error("Logout failed:", e); }
  }, []);

  const value = { user, authLoading, handleLogin, handleLogout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
