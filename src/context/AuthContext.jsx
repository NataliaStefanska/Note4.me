import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loginWithGoogle, logout, onAuth, loadAllData } from "../firebase";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    const unsub = onAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const data = await loadAllData(firebaseUser.uid);
          setInitialData(data);
        } catch (err) {
          console.warn("Firebase load failed, using local data:", err?.message || err);
          setInitialData(null);
        }
      } else {
        setUser(null);
        setInitialData(null);
      }
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

  const value = { user, authLoading, initialData, handleLogin, handleLogout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
