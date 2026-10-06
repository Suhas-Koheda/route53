"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loginApi } from "@/lib/api";

interface AuthContextType {
  user: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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
    if (saved) {
      setUser(saved);
      document.cookie = `user=${saved}; path=/; max-age=86400`;
    }
  }, []);

  const login = async (email: string, password: string) => {
    await loginApi(email, password);
    localStorage.setItem("user", email);
    document.cookie = `user=${email}; path=/; max-age=86400`;
    setUser(email);
    router.push("/hosted-zones");
  };

  const logout = () => {
    localStorage.removeItem("user");
    document.cookie = "user=; path=/; max-age=0";
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
