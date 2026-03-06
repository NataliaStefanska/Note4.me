import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loginWithGoogle, handleRedirectResult, logout, onAuth } from "../firebase";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState(null);

  useEffect(() => {
    // Handle redirect result (for mobile browsers that used signInWithRedirect)
    handleRedirectResult().catch(() => {});

    const unsub = onAuth((firebaseUser) => {
      setUser(firebaseUser || null);
      setAuthLoading(false);
      if (firebaseUser) setLoginError(null);
    });
    return unsub;
  }, []);

  const handleLogin = useCallback(async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error("Login failed:", e);
      setLoginError(e.code || e.message || "Login failed");
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try { await logout(); } catch (e) { console.error("Logout failed:", e); }
  }, []);

  const value = { user, authLoading, loginError, handleLogin, handleLogout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
