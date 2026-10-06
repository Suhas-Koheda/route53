import "@cloudscape-design/global-styles/index.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import ClientOnly from "@/components/ClientOnly";

export const metadata: Metadata = {
  title: "Route 53",
  description: "Amazon Route 53",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AuthProvider>
          <ClientOnly>
            <AppShell>{children}</AppShell>
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  );
}
