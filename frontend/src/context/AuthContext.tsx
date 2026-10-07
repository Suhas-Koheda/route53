"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loginApi, signup as signupApi } from "@/lib/api";

interface AuthContextType {
  user: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void> | void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

function sessionCookie(token: string, maxAge: number) {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `session=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null>(() =>
    typeof window !== "undefined" && localStorage.getItem("token")
      ? localStorage.getItem("user")
      : null
  );
  const router = useRouter();

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (user && tok) {
      sessionCookie(tok, 604800);
    }
  }, [user]);

  const persist = (email: string, token: string) => {
    localStorage.setItem("user", email);
    localStorage.setItem("token", token);
    sessionCookie(token, 604800);
    setUser(email);
  };

  const login = async (email: string, password: string) => {
    const res = await loginApi(email, password);
    persist(res.email, res.token);
    router.push("/hosted-zones");
  };

  const signup = async (email: string, password: string) => {
    const res = await signupApi(email, password);
    persist(res.email, res.token);
    router.push("/hosted-zones");
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } }).catch(() => undefined);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    document.cookie = "session=; path=/; max-age=0";
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
