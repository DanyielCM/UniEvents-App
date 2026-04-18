import { createContext, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser, logout as logoutService } from "../services/auth";
import { setOnUnauthorized, clearTokens } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleUnauthorized = useCallback(() => {
    clearTokens();
    setUser(null);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    setOnUnauthorized(handleUnauthorized);
  }, [handleUnauthorized]);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const u = await fetchCurrentUser();
      setUser(u);
    } catch {
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
    navigate("/");
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    const u = await fetchCurrentUser();
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
