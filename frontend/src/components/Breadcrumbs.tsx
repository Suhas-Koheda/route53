"use client";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import { usePathname, useRouter } from "next/navigation";

interface Crumb {
  text: string;
  href: string;
}

export default function Breadcrumbs() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const crumbs: Crumb[] = [{ text: "Route 53", href: "/" }];
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "hosted-zones") {
    crumbs.push({ text: "Hosted zones", href: "/hosted-zones" });
    if (segments[1] === "create") {
      crumbs.push({ text: "Create hosted zone", href: "/hosted-zones/create" });
    } else if (segments[1]) {
      crumbs.push({ text: segments[1], href: `/hosted-zones/${segments[1]}` });
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
