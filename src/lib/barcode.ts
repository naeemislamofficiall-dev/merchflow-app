// সেকশন ৫২: কোডের ফরম্যাট  MF:<ধরন>:<মান>   যেমন  MF:ROLL:FAB-LOT22-R0047
export type CodeType =
  | "ROLL" | "LOT" | "BUNDLE" | "PRODUCTION_ORDER" | "CARTON" | "FINISHED_GOOD";

const TYPES: CodeType[] = ["ROLL", "LOT", "BUNDLE", "PRODUCTION_ORDER", "CARTON", "FINISHED_GOOD"];

export function buildCode(type: CodeType, value: string): string {
  return `MF:${type}:${value}`;
}

export function parseCode(raw: string): { type: CodeType; value: string } | null {
  const m = /^MF:([A-Z_]+):(.+)$/.exec(raw.trim());
  if (!m || !TYPES.includes(m[1] as CodeType)) return null;
  return { type: m[1] as CodeType, value: m[2] };
}