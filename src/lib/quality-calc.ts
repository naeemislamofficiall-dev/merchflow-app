// সেকশন ৩৩-৩৫-এর হিসাব। এখানে ডাটাবেস নেই, তাই আলাদা করে পরীক্ষা করা যায়।

const round1 = (n: number) => Math.round(n * 10) / 10;

// DHU = প্রতি ১০০ পিসে কয়টা ত্রুটি। checked ০ হলে null
export function dhu(defects: number, checked: number): number | null {
  if (checked <= 0) return null;
  return round1((defects / checked) * 100);
}

export type ParetoRow = { name: string; count: number; pct: number; cumulativePct: number };

// Defect Pareto: বেশি থেকে কম সাজানো, সাথে ক্রমযোগ %
export function pareto(items: { name: string; count: number }[]): ParetoRow[] {
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.name, (merged.get(i.name) ?? 0) + i.count);
  const rows = [...merged.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const total = rows.reduce((s, r) => s + r.count, 0);
  let run = 0;
  return rows.map((r) => {
    run += r.count;
    return {
      ...r,
      pct: total > 0 ? round1((r.count / total) * 100) : 0,
      cumulativePct: total > 0 ? round1((run / total) * 100) : 0,
    };
  });
}

// ---------- AQL (ISO 2859-1, একক নমুনা, স্বাভাবিক পরীক্ষা) ----------
export const AQL_LEVELS = ["S1", "S2", "S3", "S4", "I", "II", "III"] as const;
export type AqlLevel = (typeof AQL_LEVELS)[number];

// প্রতি সারি: [লটের সর্বোচ্চ সংখ্যা, S1 S2 S3 S4 I II III-এর code letter]
const LOT_BANDS: [number, string][] = [
  [8, "AAAAAAB"], [15, "AAAAABC"], [25, "AABBBCD"], [50, "ABBCCDE"],
  [90, "BBCCCEF"], [150, "BBCDDFG"], [280, "BCDEEGH"], [500, "BCDEFHJ"],
  [1200, "CCEFGJK"], [3200, "CDEGHKL"], [10000, "CDFGJLM"], [35000, "CDFHKMN"],
  [150000, "DEGJLNP"], [500000, "DEGJMPQ"], [Infinity, "DEHKNQR"],
];

const SAMPLE_BY_LETTER: Record<string, number> = {
  A: 2, B: 3, C: 5, D: 8, E: 13, F: 20, G: 32, H: 50, J: 80,
  K: 125, L: 200, M: 315, N: 500, P: 800, Q: 1250, R: 2000,
};

// নমুনার আকার (লটের চেয়ে বড় হলে পুরো লটই দেখা হয়)
export function aqlSampleSize(level: AqlLevel, lotSize: number): number {
  const band = LOT_BANDS.find(([max]) => lotSize <= max)!;
  const letter = band[1][AQL_LEVELS.indexOf(level)];
  return Math.min(SAMPLE_BY_LETTER[letter], lotSize);
}

// Accept/Reject: শুধু সবচেয়ে প্রচলিত AQL 2.5 আর 4.0 বসানো আছে।
// অন্য AQL বা বায়ারের নিজস্ব স্ট্যান্ডার্ড হলে accept/reject হাতে দিতে হবে।
// এই টেবিল আপনার বায়ারের চার্টের সাথে মিলিয়ে নিন।
const AC: Record<string, Record<number, number>> = {
  "2.5": { 2: 0, 3: 0, 5: 0, 8: 0, 13: 1, 20: 1, 32: 2, 50: 3, 80: 5, 125: 7, 200: 10, 315: 14, 500: 21, 800: 21, 1250: 21, 2000: 21 },
  "4": { 2: 0, 3: 0, 5: 1, 8: 1, 13: 2, 20: 3, 32: 5, 50: 7, 80: 10, 125: 14, 200: 21, 315: 21, 500: 21, 800: 21, 1250: 21, 2000: 21 },
};

export function defaultAccept(aql: number, sampleSize: number): number | null {
  if (aql === 0) return 0; // Critical: একটাও চলবে না
  const table = AC[String(aql)];
  if (!table) return null;
  if (table[sampleSize] !== undefined) return table[sampleSize];
  // লটের চেয়ে ছোট নমুনা হলে (পুরো লট দেখা) সবচেয়ে কাছের ছোট আকারের মান
  const sizes = Object.keys(table).map(Number).sort((a, b) => a - b);
  const below = sizes.filter((s) => s <= sampleSize).pop();
  return below === undefined ? 0 : table[below];
}

export type AqlFound = {
  foundCritical: number;
  foundMajor: number;
  foundMinor: number;
  rejectMajor: number;
  rejectMinor: number;
};

// Critical একটাও থাকলে FAIL। Major/Minor reject সংখ্যায় পৌঁছালে FAIL।
export function aqlResult(f: AqlFound): "PASS" | "FAIL" {
  if (f.foundCritical > 0) return "FAIL";
  if (f.foundMajor >= f.rejectMajor) return "FAIL";
  if (f.foundMinor >= f.rejectMinor) return "FAIL";
  return "PASS";
}