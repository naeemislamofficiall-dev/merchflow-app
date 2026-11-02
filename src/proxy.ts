import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decideRoute } from "@/lib/portal-access";

export const proxy = auth((req) => {
  const portalType = req.auth?.user?.portalType ?? null;
  const decision = decideRoute({
    pathname: req.nextUrl.pathname,
    isLoggedIn: !!req.auth,
    portalType,
  });
  if (decision.kind === "redirect") {
    return NextResponse.redirect(new URL(decision.to, req.nextUrl));
  }
  if (decision.kind === "deny") {
    return NextResponse.json(
      { error: decision.status === 401 ? "Login required" : "Access denied" },
      { status: decision.status },
    );
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};