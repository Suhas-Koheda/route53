"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import RadioGroup from "@cloudscape-design/components/radio-group";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Link from "@cloudscape-design/components/link";

export default function LoginPage() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("root");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleEmailNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setStep("password");
  };

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
    <div style={{ backgroundColor: "#f2f3f3", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #d5dbdb", backgroundColor: "#fff" }}>
        <span style={{ color: "#ff9900", fontSize: 22, fontWeight: "bold" }}>aws</span>
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", paddingTop: 48 }}>
        <div style={{ backgroundColor: "#fff", borderRadius: 8, padding: "32px 36px", width: 420, boxShadow: "0 1px 4px rgba(0,0,0,0.12)", border: "1px solid #d5dbdb" }}>
          {step === "email" ? (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 20 }}>Sign in</h1>
              <form onSubmit={handleEmailNext}>
                <FormField label="Root user or IAM user">
                  <RadioGroup
                    value={userType}
                    onChange={({ detail }) => setUserType(detail.value)}
                    items={[
                      { value: "root", label: "Root user", description: "Account owner with full access." },
                      { value: "iam", label: "IAM user", description: "User with assigned permissions." },
                    ]}
                  />
                </FormField>
                <FormField label="Email or account ID" description="The email address or account ID you used to sign up.">
                  <Input
                    type="text"
                    value={email}
                    onChange={({ detail }) => setEmail(detail.value)}
                    placeholder="you@example.com"
                    autoFocus
                  />
                </FormField>
                <div style={{ marginTop: 20 }}>
                  <Button formAction="submit" variant="primary">
                    Next
                  </Button>
                </div>
              </form>
              <p style={{ marginTop: 20, fontSize: 13, color: "#545b64" }}>
                New to AWS? <Link href="/signup" onFollow={(e) => { e.preventDefault(); router.push("/signup"); }}>Create an AWS account</Link>
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Welcome back</h1>
              <p style={{ fontSize: 14, color: "#545b64", marginBottom: 20 }}>{email}</p>
              {error && <Box color="text-status-error" margin={{ bottom: "m" }}>{error}</Box>}
              <form onSubmit={handleSignIn}>
                <FormField label="Password">
                  <Input
                    type="password"
                    value={password}
                    onChange={({ detail }) => setPassword(detail.value)}
                    autoFocus
                  />
                </FormField>
                <div style={{ marginTop: 20 }}>
                  <Button formAction="submit" variant="primary">
                    Sign in
                  </Button>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Button variant="link" onClick={() => setStep("email")}>
                    Back
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "16px 24px", borderTop: "1px solid #d5dbdb", backgroundColor: "#fff", textAlign: "center" }}>
        <SpaceBetween direction="horizontal" size="xs">
          <Link href="#" onFollow={(e) => e.preventDefault()}>Privacy</Link>
          <Link href="#" onFollow={(e) => e.preventDefault()}>Terms of use</Link>
          <Link href="#" onFollow={(e) => e.preventDefault()}>Cookie preferences</Link>
        </SpaceBetween>
      </div>
    </div>
  );
}
