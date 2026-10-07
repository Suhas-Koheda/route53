"use client";
import { useRouter, usePathname } from "next/navigation";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { type: "link" as const, text: "Dashboard", href: "/dashboard" },
  {
    type: "section" as const,
    text: "DNS Management",
    items: [
      { type: "link" as const, text: "Hosted zones", href: "/hosted-zones" },
      { type: "link" as const, text: "Traffic policies", href: "/traffic-policies" },
    ],
  },
  {
    type: "section" as const,
    text: "Availability Monitoring",
    items: [{ type: "link" as const, text: "Health checks", href: "/health-checks" }],
  },
  {
    type: "section" as const,
    text: "Resolver",
    items: [{ type: "link" as const, text: "Resolver rules", href: "/resolver" }],
  },
  { type: "link" as const, text: "Profiles", href: "/profiles" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (pathname === "/login" || pathname === "/signup" || pathname === "/") return <>{children}</>;

  return (
    <>
      <TopNavigation
        identity={{ href: "/hosted-zones", title: "Route 53" }}
        utilities={[
          { type: "button", text: "us-east-1", ariaLabel: "Region" },
          { type: "button", iconName: "notification", ariaLabel: "Notifications" },
          {
            type: "menu-dropdown",
            text: user?.split("@")[0] || "Account",
            items: [{ id: "signout", text: "Sign out" }],
            onItemClick: (e) => {
              if (e.detail.id === "signout") logout();
            },
          },
        ]}
      />
      <AppLayout
        navigation={
          <SideNavigation
            items={navItems}
            activeHref={pathname}
            onFollow={(e) => { e.preventDefault(); router.push(e.detail.href); }}
          />
        }
        content={children}
        breadcrumbs={
          <span>
            Route 53 /{" "}
            {pathname.startsWith("/hosted-zones/")
              ? "Hosted zones / " + (pathname.split("/")[2] || "")
              : pathname.split("/")[1] || "Hosted zones"}
          </span>
        }
      />
    </>
  );
}
