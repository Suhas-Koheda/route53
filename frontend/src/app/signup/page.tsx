"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup, loginApi } from "@/lib/api";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await signup(email, password);
      await loginApi(email, password);
      localStorage.setItem("user", email);
      document.cookie = `user=${email}; path=/; max-age=86400`;
      router.push("/hosted-zones");
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{ backgroundColor: "#0f1b2a", minHeight: "100vh" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #2a3644" }}>
        <a href="/login" style={{ textDecoration: "none" }}>
          <span style={{ color: "#ff9900", fontSize: 24, fontWeight: "bold" }}>aws</span>
        </a>
      </div>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 8, padding: 40, width: 440 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Create an AWS account</h1>
          <form onSubmit={handleSignup}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #aab7b8", borderRadius: 4, fontSize: 14, boxSizing: "border-box" }}
              required
            />
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, margin: "16px 0 6px" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #aab7b8", borderRadius: 4, fontSize: 14, boxSizing: "border-box" }}
              required
            />
            {error && (
              <div style={{ backgroundColor: "#fde9e9", border: "1px solid #d32f2f", color: "#b71c1c", padding: "10px 12px", borderRadius: 4, fontSize: 13, marginTop: 16 }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              style={{ marginTop: 24, width: "100%", backgroundColor: "#ec7211", color: "#fff", border: "none", borderRadius: 4, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Create account
            </button>
          </form>
          <p style={{ marginTop: 20, fontSize: 13 }}>
            Already have an account? <a href="/login" style={{ color: "#0972d3" }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
