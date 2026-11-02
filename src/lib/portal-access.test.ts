import { describe, expect, it } from "vitest";
import { decideRoute } from "./portal-access";

const supplier = { isLoggedIn: true, portalType: "SUPPLIER" as const };
const buyer = { isLoggedIn: true, portalType: "BUYER" as const };
const internal = { isLoggedIn: true, portalType: null };
const anon = { isLoggedIn: false };

describe("login chhara", () => {
  it("public page allow", () => {
    expect(decideRoute({ ...anon, pathname: "/login" })).toEqual({ kind: "allow" });
    expect(decideRoute({ ...anon, pathname: "/forgot-password" })).toEqual({ kind: "allow" });
    expect(decideRoute({ ...anon, pathname: "/api/jobs/run" })).toEqual({ kind: "allow" });
  });
  it("private page-e /login redirect", () => {
    expect(decideRoute({ ...anon, pathname: "/portal/supplier" })).toEqual({ kind: "redirect", to: "/login" });
    expect(decideRoute({ ...anon, pathname: "/orders" })).toEqual({ kind: "redirect", to: "/login" });
  });
  it("API-te redirect na, 401", () => {
    expect(decideRoute({ ...anon, pathname: "/api/v1/portal/supplier/pos" })).toEqual({ kind: "deny", status: 401 });
  });
});

describe("supplier portal user", () => {
  it("nijer portal ar API allow", () => {
    expect(decideRoute({ ...supplier, pathname: "/portal/supplier" })).toEqual({ kind: "allow" });
    expect(decideRoute({ ...supplier, pathname: "/portal/supplier/pos/abc" })).toEqual({ kind: "allow" });
    expect(decideRoute({ ...supplier, pathname: "/api/v1/portal/supplier/pos" })).toEqual({ kind: "allow" });
  });
  it("internal page-e dhukte parbe na", () => {
    for (const p of ["/", "/dashboard", "/orders", "/admin/users", "/inventory/stock", "/ppc"]) {
      expect(decideRoute({ ...supplier, pathname: p })).toEqual({ kind: "redirect", to: "/portal/supplier" });
    }
  });
  it("buyer portal ar buyer API-te na", () => {
    expect(decideRoute({ ...supplier, pathname: "/portal/buyer" })).toEqual({ kind: "redirect", to: "/portal/supplier" });
    expect(decideRoute({ ...supplier, pathname: "/api/v1/portal/buyer/orders" })).toEqual({ kind: "deny", status: 403 });
  });
  it("prefix trick kaj kore na", () => {
    expect(decideRoute({ ...supplier, pathname: "/portal/supplierx" })).toEqual({ kind: "redirect", to: "/portal/supplier" });
    expect(decideRoute({ ...supplier, pathname: "/portal" })).toEqual({ kind: "redirect", to: "/portal/supplier" });
  });
  it("traversal / encoded path block", () => {
    expect(decideRoute({ ...supplier, pathname: "/portal/supplier/../../admin" })).toEqual({ kind: "redirect", to: "/portal/supplier" });
    expect(decideRoute({ ...supplier, pathname: "/portal/supplier/%2e%2e/admin" })).toEqual({ kind: "redirect", to: "/portal/supplier" });
    expect(decideRoute({ ...supplier, pathname: "/api/v1/portal/supplier/..%2fadmin" })).toEqual({ kind: "deny", status: 403 });
  });
  it("onno API deny", () => {
    expect(decideRoute({ ...supplier, pathname: "/api/v1/orders" })).toEqual({ kind: "deny", status: 403 });
    expect(decideRoute({ ...supplier, pathname: "/api/other" })).toEqual({ kind: "deny", status: 403 });
  });
  it("/login-e gele portal home", () => {
    expect(decideRoute({ ...supplier, pathname: "/login" })).toEqual({ kind: "redirect", to: "/portal/supplier" });
  });
  it("password reset page allow", () => {
    expect(decideRoute({ ...supplier, pathname: "/reset-password" })).toEqual({ kind: "allow" });
  });
});

describe("buyer portal user", () => {
  it("nijer portal allow, supplier portal block", () => {
    expect(decideRoute({ ...buyer, pathname: "/portal/buyer/orders" })).toEqual({ kind: "allow" });
    expect(decideRoute({ ...buyer, pathname: "/portal/supplier" })).toEqual({ kind: "redirect", to: "/portal/buyer" });
    expect(decideRoute({ ...buyer, pathname: "/api/v1/portal/supplier/pos" })).toEqual({ kind: "deny", status: 403 });
  });
});

describe("internal user", () => {
  it("shob internal page allow", () => {
    expect(decideRoute({ ...internal, pathname: "/dashboard" })).toEqual({ kind: "allow" });
    expect(decideRoute({ ...internal, pathname: "/orders/123" })).toEqual({ kind: "allow" });
  });
  it("portal page-e dhukte parbe na", () => {
    expect(decideRoute({ ...internal, pathname: "/portal/supplier" })).toEqual({ kind: "redirect", to: "/dashboard" });
    expect(decideRoute({ ...internal, pathname: "/portal/buyer/orders" })).toEqual({ kind: "redirect", to: "/dashboard" });
  });
  it("portal API-te dhukte parbe na", () => {
    expect(decideRoute({ ...internal, pathname: "/api/v1/portal/supplier/pos" })).toEqual({ kind: "deny", status: 403 });
  });
  it("/login-e gele /", () => {
    expect(decideRoute({ ...internal, pathname: "/login" })).toEqual({ kind: "redirect", to: "/" });
  });
});