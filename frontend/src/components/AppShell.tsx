"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import Input from "@cloudscape-design/components/input";
import { useAuth } from "@/context/AuthContext";
import Breadcrumbs from "@/components/Breadcrumbs";

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

function activeHrefFor(pathname: string): string {
  if (pathname.startsWith("/hosted-zones")) return "/hosted-zones";
  return pathname;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  if (pathname === "/login" || pathname === "/signup" || pathname === "/") return <>{children}</>;

  return (
    <>
      <TopNavigation
        identity={{ href: "/hosted-zones", title: "Route 53", logo: { src: "/aws-wordmark.svg", alt: "AWS" } }}
        search={
          <Input value={searchValue} onChange={({ detail }) => setSearchValue(detail.value)} placeholder="Search services, features, FAQs" ariaLabel="Search" />
        }
        utilities={[
          {
            type: "menu-dropdown",
            text: "Services",
            items: [
              { id: "route53", text: "Route 53" },
              { id: "cloudfront", text: "CloudFront" },
              { id: "api_gateway", text: "API Gateway" },
            ],
            onItemClick: (e) => {
              if (e.detail.id === "route53") router.push("/hosted-zones");
            },
          },
          {
            type: "menu-dropdown",
            text: "Global",
            items: [{ id: "global", text: "Global" }],
          },
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
            activeHref={activeHrefFor(pathname)}
            onFollow={(e) => { e.preventDefault(); if (e.detail.href) router.push(e.detail.href); }}
          />
        }
        content={children}
        breadcrumbs={<Breadcrumbs />}
      />
    </>
  );
}
