import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/"];

export function proxy(request: NextRequest) {
  const session = request.cookies.get("session");
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname === "/signup") {
    if (session) {
      return NextResponse.redirect(new URL("/hosted-zones", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|route53.html|.*\\.).*)"],
};
