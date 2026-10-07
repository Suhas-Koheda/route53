"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import Link from "@cloudscape-design/components/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signup } = useAuth();
  const router = useRouter();

  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/`~';]/.test(password)) {
      setError("Password must be at least 8 characters and include lowercase, uppercase, a number, and a special character.");
      return;
    }
    try {
      await signup(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    }
  };

  return (
    <div style={{ backgroundColor: "#f2f3f3", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #d5dbdb", backgroundColor: "#fff" }}>
        <Link href="/login" onFollow={(e) => { e.preventDefault(); router.push("/login"); }}>
          <span style={{ color: "#ff9900", fontSize: 22, fontWeight: "bold" }}>aws</span>
        </Link>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", paddingTop: 48 }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 8, padding: "32px 36px", width: 420, boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid #d5dbdb" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Create an AWS account</h1>
          <form onSubmit={handleSignup}>
            <FormField label="Email">
              <Input
                type="email"
                value={email}
                onChange={({ detail }) => setEmail(detail.value)}
                placeholder="you@example.com"
              />
            </FormField>
            <FormField label="Password" description="Min 8 chars, at least one lowercase, uppercase, number, and special character (e.g. P@ssw0rd!).">
              <Input
                type="password"
                value={password}
                onChange={({ detail }) => setPassword(detail.value)}
              />
            </FormField>
            {error && <Box color="text-status-error" margin={{ vertical: "s" }}>{error}</Box>}
            <div style={{ marginTop: 20 }}>
              <Button formAction="submit" variant="primary">
                Create account
              </Button>
            </div>
          </form>
          <p style={{ marginTop: 20, fontSize: 13 }}>
            Already have an account? <Link href="/login" onFollow={(e) => { e.preventDefault(); router.push("/login"); }}>Sign in</Link>
          </p>
        </div>
      </div>

      <div style={{ padding: "16px 24px", borderTop: "1px solid #d5dbdb", backgroundColor: "#fff", textAlign: "center" }}>
        <Link href="#" onFollow={(e) => e.preventDefault()}>Privacy</Link>
        <Link href="#" onFollow={(e) => e.preventDefault()}>Terms of use</Link>
      </div>
    </div>
  );
}
