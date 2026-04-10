import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "crypto";

function expectedToken() {
  const secret = process.env.APP_SECRET ?? "dev-secret-change-me";
  return createHmac("sha256", secret).update("authenticated").digest("hex");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the login page and Next.js internals through
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth")?.value;
  if (token && token === expectedToken()) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
