import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function expectedToken(): Promise<string> {
  const secret = process.env.APP_SECRET ?? "dev-secret-change-me";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("authenticated"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always set x-pathname so layout.tsx can read it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Let login page through without auth check
  if (pathname.startsWith("/login")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = request.cookies.get("auth")?.value;
  const expected = await expectedToken();

  if (token && token === expected) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
