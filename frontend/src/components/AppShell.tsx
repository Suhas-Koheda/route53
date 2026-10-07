"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import Input, { InputProps } from "@cloudscape-design/components/input";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { useAuth } from "@/context/AuthContext";
import Breadcrumbs from "@/components/Breadcrumbs";
import ShortcutsHelp from "@/components/ShortcutsHelp";

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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<InputProps.Ref>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const enabled = localStorage.getItem("colorMode") === Mode.Dark;
    // Restore the saved appearance after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDarkMode(enabled);
    applyMode(enabled ? Mode.Dark : Mode.Light);
  }, []);

  const toggleDarkMode = () => {
    const next = darkMode ? Mode.Light : Mode.Dark;
    setDarkMode(!darkMode);
    localStorage.setItem("colorMode", next);
    applyMode(next);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "c" || e.key === "C") {
        if (pathname === "/hosted-zones") {
          router.push("/hosted-zones/create");
        } else if (pathname.startsWith("/hosted-zones/")) {
          window.dispatchEvent(new CustomEvent("route53:create-record"));
        }
      } else if (e.key === "?") {
        setShowShortcuts((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  if (pathname === "/login" || pathname === "/signup" || pathname === "/") return <>{children}</>;

  return (
    <>
      <TopNavigation
        identity={{ href: "/hosted-zones", title: "Route 53", logo: { src: "/aws-wordmark.svg", alt: "AWS" } }}
        search={<Input ref={searchRef} value={searchValue} onChange={({ detail }) => setSearchValue(detail.value)} placeholder="Search services, features, FAQs" ariaLabel="Search" />}
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
          { type: "button", iconName: "status-info", ariaLabel: "Keyboard shortcuts", onClick: () => setShowShortcuts(true) },
          { type: "button", iconName: darkMode ? "star-filled" : "star", ariaLabel: "Toggle dark mode", onClick: toggleDarkMode },
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
      <ShortcutsHelp visible={showShortcuts} onDismiss={() => setShowShortcuts(false)} />
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
