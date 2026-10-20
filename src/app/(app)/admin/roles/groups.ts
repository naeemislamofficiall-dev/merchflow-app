import { ALL_PERMISSION_KEYS } from "@/lib/permission-keys";

// permission-গুলো module ধরে সাজানো (যেমন "po.view" → module "po")
export function permissionGroups() {
  const map = new Map<string, string[]>();
  for (const key of ALL_PERMISSION_KEYS) {
    const mod = key.split(".")[0];
    map.set(mod, [...(map.get(mod) ?? []), key]);
  }
  return [...map.entries()].map(([mod, keys]) => ({ module: mod, keys }));
}