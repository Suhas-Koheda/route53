"use client";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getZone } from "@/lib/api";

interface Crumb {
  text: string;
  href: string;
}

export default function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [zoneName, setZoneName] = useState<string | null>(null);
  const segments = pathname.split("/").filter(Boolean);
  const zoneId = segments[0] === "hosted-zones" && segments[1] && segments[1] !== "create" ? segments[1] : null;

  useEffect(() => {
    if (!zoneId) return;
    let active = true;
    getZone(zoneId).then((zone) => {
      if (active) setZoneName(zone.name);
    }).catch(() => {
      if (active) setZoneName(null);
    });
    return () => {
      active = false;
    };
  }, [zoneId]);

  const crumbs: Crumb[] = [{ text: "Route 53", href: "/" }];

  if (segments[0] === "hosted-zones") {
    crumbs.push({ text: "Hosted zones", href: "/hosted-zones" });
    if (segments[1] === "create") {
      crumbs.push({ text: "Create hosted zone", href: "/hosted-zones/create" });
    } else if (segments[1]) {
      crumbs.push({ text: zoneName || segments[1], href: `/hosted-zones/${segments[1]}` });
    }
  } else if (segments[0]) {
    const label = segments[0]
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    crumbs.push({ text: label, href: `/${segments[0]}` });
  }

  return (
    <BreadcrumbGroup
      items={crumbs}
      onFollow={(e) => {
        e.preventDefault();
        if (e.detail.href) router.push(e.detail.href);
      }}
    />
  );
}
