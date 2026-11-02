// Proxy-r route decision. Pure + deny-by-default allow-list.
import type { PortalType } from "./portal-scope";

export type RouteInput = {
  pathname: string;
  isLoggedIn: boolean;
  portalType?: PortalType | null;
};

export type RouteDecision =
  | { kind: "allow" }
  | { kind: "redirect"; to: string }
  | { kind: "deny"; status: 401 | 403 };

const PUBLIC_PAGES = ["/login", "/forgot-password", "/reset-password"];

export function portalHome(type: PortalType): string {
  return type === "SUPPLIER" ? "/portal/supplier" : "/portal/buyer";
}

export function portalApiBase(type: PortalType): string {
  return type === "SUPPLIER" ? "/api/v1/portal/supplier" : "/api/v1/portal/buyer";
}

function isUnder(path: string, base: string): boolean {
  return path === base || path.startsWith(base + "/");
}

// ".." , "//" , backslash, encoded dot/slash: portal user-er jonno shob block
function isSuspicious(path: string): boolean {
  return path.includes("..") || path.includes("//") || path.includes("\\") || /%2e|%2f|%5c/i.test(path);
}

export function decideRoute(input: RouteInput): RouteDecision {
  const { pathname, isLoggedIn, portalType } = input;
  const isApi = isUnder(pathname, "/api");
  const isPublic = PUBLIC_PAGES.some((p) => isUnder(pathname, p)) || pathname.startsWith("/api/jobs/") || pathname === "/api/health";

  // 1) Login chhara
  if (!isLoggedIn) {
    if (isPublic) return { kind: "allow" };
    if (isUnder(pathname, "/api/v1")) return { kind: "deny", status: 401 };
    return { kind: "redirect", to: "/login" };
  }

  // 2) Portal user: shudhu nijer portal + nijer API (allow-list), baki shob deny
  if (portalType) {
    const home = portalHome(portalType);
    if (isSuspicious(pathname)) {
      return isApi ? { kind: "deny", status: 403 } : { kind: "redirect", to: home };
    }
    if (isUnder(pathname, "/login")) return { kind: "redirect", to: home };
    if (isPublic) return { kind: "allow" };
    if (isUnder(pathname, home)) return { kind: "allow" };
    if (isUnder(pathname, portalApiBase(portalType))) return { kind: "allow" };
    if (isApi) return { kind: "deny", status: 403 };
    return { kind: "redirect", to: home };
  }

  // 3) Internal user: portal page/API-te dhukte parbe na
  if (isUnder(pathname, "/login")) return { kind: "redirect", to: "/" };
  if (isUnder(pathname, "/portal")) return { kind: "redirect", to: "/dashboard" };
  if (isUnder(pathname, "/api/v1/portal")) return { kind: "deny", status: 403 };
  return { kind: "allow" };
}