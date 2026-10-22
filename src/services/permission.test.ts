import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/services/context.service", () => ({
  getActiveContext: vi.fn().mockResolvedValue({ companyId: "c1" }),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/audit", () => ({ writeAudit: vi.fn() }));

import { AuthError, can } from "@/lib/permissions";
import { buyerService } from "./buyer.service";

function loginWith(permissions: string[]) {
  authMock.mockResolvedValue({
    user: { id: "u1", email: "a@b.c", companyId: "c1", roleId: "r1", permissions },
  });
}

beforeEach(() => authMock.mockReset());

describe("can()", () => {
  const u = { id: "u", email: "", companyId: "c", roleId: "r" };
  it("exact permission", () => {
    expect(can({ ...u, permissions: ["buyer.view"] }, "buyer.view")).toBe(true);
    expect(can({ ...u, permissions: ["buyer.view"] }, "buyer.create")).toBe(false);
  });
  it("wildcard", () => {
    expect(can({ ...u, permissions: ["*"] }, "anything.here")).toBe(true);
  });
});

describe("buyerService permission guard", () => {
  it("rejects when not logged in (401)", async () => {
    authMock.mockResolvedValue(null);
    await expect(buyerService.list()).rejects.toMatchObject({ status: 401 });
  });

  it("create without buyer.create is rejected (403)", async () => {
    loginWith(["buyer.view"]);
    const p = buyerService.create({ code: "X", name: "X" });
    await expect(p).rejects.toBeInstanceOf(AuthError);
    await expect(buyerService.create({})).rejects.toThrow("Missing permission: buyer.create");
  });

  it("update without buyer.edit is rejected", async () => {
    loginWith(["buyer.view", "buyer.create"]);
    await expect(buyerService.update("b1", {})).rejects.toThrow("Missing permission: buyer.edit");
  });

  it("setActive without buyer.edit is rejected", async () => {
    loginWith([]);
    await expect(buyerService.setActive("b1", false)).rejects.toThrow(
      "Missing permission: buyer.edit"
    );
  });

  it("list without buyer.view is rejected", async () => {
    loginWith(["buyer.create"]);
    await expect(buyerService.list()).rejects.toThrow("Missing permission: buyer.view");
  });

  it("with permission the guard passes (fails later on validation, not on permission)", async () => {
    loginWith(["buyer.create"]);
    const err = await buyerService.create({}).catch((e) => e);
    expect(err).not.toBeInstanceOf(AuthError);
  });
});
