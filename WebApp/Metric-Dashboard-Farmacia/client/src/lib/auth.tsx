import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest } from "./queryClient";

interface AuthContextType {
  authenticated: boolean;
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAuthenticated(true);
        setUsername(data.username);
      } else {
        setAuthenticated(false);
        setUsername(null);
      }
    } catch {
      setAuthenticated(false);
      setUsername(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await res.json();
    setAuthenticated(true);
    setUsername(data.username);
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ authenticated, username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
