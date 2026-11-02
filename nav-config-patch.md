# src/components/layout/nav-config.ts  -- shob notun nav item (apnar NAV array-te boshan)

Existing group-gulor bhitore (ja group-e mil ache):

## Inventory group-e (Step 1 + 2):
  { label: "Stock transfers", href: "/inventory/transfers", permission: "inventory.view", ready: true },
  { label: "Stock counts", href: "/inventory/counts", permission: "stockcount.view", ready: true },

## T&A / Samples group-e (Step 4):
  { label: "T&A calendar", href: "/tna/calendar", permission: "tna.view", ready: true },
  { label: "T&A risk", href: "/tna/risk", permission: "tna.view", ready: true },
  { label: "Sample calendar", href: "/samples/calendar", permission: "sample.view", ready: true },

## Quality group-e (Step 5):
  { label: "DHU & Pareto", href: "/quality/dhu", permission: "qc.view", ready: true },

## Finance group-e (Step 8):
  { label: "Budgets", href: "/finance/budgets", permission: "budget.view", ready: true },

## Executive group-e (Steps 9, 11):
  { label: "Order risk & brief", href: "/ai", permission: "ai.view", ready: true },
  { label: "Account security", href: "/account/security", ready: true },

## Notun group (Steps 7, 10) -- NAV array-te ekta notun object:
  {
    label: "HR & Compliance",
    items: [
      { label: "Compliance", href: "/compliance", permission: "compliance.view", ready: true },
      { label: "Employees", href: "/employees", permission: "hr.view", ready: true },
      { label: "Attendance", href: "/attendance", permission: "attendance.view", ready: true },
      { label: "Leave", href: "/leave", permission: "leave.view", ready: true },
      { label: "Payroll", href: "/payroll", permission: "payroll.view", ready: true },
    ],
  },

## Step 6: src/lib/portal-access.ts -- decideRoute()-te isPublic line-ta eirokom koren:
  const isPublic =
    PUBLIC_PAGES.some((p) => isUnder(pathname, p)) ||
    pathname.startsWith("/api/jobs/") ||
    pathname === "/api/health";
