"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setStep("password");
  };

  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg === "Invalid credentials"
        ? "The email or password is incorrect. Try again."
        : msg);
    }
  };

  return (
    <div style={{ backgroundColor: "#0f1b2a", minHeight: "100vh" }}>
      {/* AWS header */}
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #2a3644" }}>
        <span style={{ color: "#ff9900", fontSize: 24, fontWeight: "bold" }}>aws</span>
      </div>

      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 8, padding: 40, width: 440, boxShadow: "0 2px 24px rgba(0,0,0,0.3)" }}>
          {step === "email" ? (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Sign in</h1>
              <form onSubmit={handleEmailNext}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Email or account ID</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #aab7b8", borderRadius: 4, fontSize: 14, boxSizing: "border-box" }}
                  autoFocus
                />
                <button
                  type="submit"
                  style={{ marginTop: 24, width: "100%", backgroundColor: "#ec7211", color: "#fff", border: "none", borderRadius: 4, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Next
                </button>
              </form>
              <p style={{ marginTop: 20, fontSize: 13, color: "#545b64" }}>
                New to AWS? <a href="/signup" style={{ color: "#0972d3" }}>Create an AWS account</a>
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Welcome back</h1>
              <p style={{ fontSize: 14, color: "#545b64", marginBottom: 24 }}>{email}</p>
              {error && (
                <div style={{ backgroundColor: "#fde9e9", border: "1px solid #d32f2f", color: "#b71c1c", padding: "10px 12px", borderRadius: 4, fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}
              <form onSubmit={handleSignIn}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #aab7b8", borderRadius: 4, fontSize: 14, boxSizing: "border-box" }}
                  autoFocus
                />
                <button
                  type="submit"
                  style={{ marginTop: 24, width: "100%", backgroundColor: "#ec7211", color: "#fff", border: "none", borderRadius: 4, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: "#0972d3", fontSize: 14, cursor: "pointer" }}
                >
                  ← Back
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
