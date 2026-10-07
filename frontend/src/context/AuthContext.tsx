"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loginApi } from "@/lib/api";

interface AuthContextType {
  user: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void> | void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("user");
    const tok = localStorage.getItem("token");
    if (saved && tok) {
      setUser(saved);
      document.cookie = `session=${tok}; path=/; max-age=86400`;
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    localStorage.setItem("user", res.email);
    localStorage.setItem("token", res.token);
    document.cookie = `session=${res.token}; path=/; max-age=86400`;
    setUser(res.email);
    router.push("/hosted-zones");
  };

  const logout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); } catch {}
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    document.cookie = "session=; path=/; max-age=0";
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
