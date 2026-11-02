# src/lib/permission-keys.ts  -- MODULES object-er bhitore ei line-gulo add korun

  stockcount: ["view", "create", "post"],
  compliance: ["view", "create", "edit"],
  budget: ["view", "edit"],
  mfa: ["manage"],            // optional: admin chai le onno-der MFA reset korte
  hr: ["view", "manage"],
  attendance: ["view", "record"],
  leave: ["view", "create", "approve"],
  payroll: ["view", "run", "approve"],
  ai: ["view"],

# Tarpor permission DB-te boshan:   npx tsx scripts/seed-permissions.ts
# Tarpor Admin > Roles e giye role-e permission tick korun.
# (Admin-er "*" thakle shob auto pabe.)
