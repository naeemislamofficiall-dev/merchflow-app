// Marker / lay hisab (spec Sec 28). DB nei, tai alada test kora jay.

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

// Marker-e ek ply-te koto piece hobe = size ratio-r jogfol
export function piecesPerPly(ratio: Record<string, number>): number {
  return Object.values(ratio).reduce((s, n) => s + n, 0);
}

// Fabric requirement = marker length (m) x plies. Wastage ar alada, eta shudhu lay-er fabric
export function layFabric(markerLengthM: number, plies: number): number {
  return round3(markerLengthM * plies);
}

// Lay-er piece = ply x pieces per ply
export function layPieces(ratio: Record<string, number>, plies: number): number {
  return piecesPerPly(ratio) * plies;
}

// Marker efficiency % = piece-gulor fabric area / marker area x 100.
// areaPerPieceM2: ek piece-er fabric area (m2). width cm, length m.
export function markerEfficiency(
  ratio: Record<string, number>,
  areaPerPieceM2: number,
  widthCm: number,
  lengthM: number
): number | null {
  const markerArea = (widthCm / 100) * lengthM;
  if (markerArea <= 0 || areaPerPieceM2 <= 0) return null;
  return round2(((piecesPerPly(ratio) * areaPerPieceM2) / markerArea) * 100);
}

// Marker-er size ratio cut plan-er size ratio-r sathe milte hobe (same size, same number)
export function ratioMatches(a: Record<string, number>, b: Record<string, number>): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  return ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

// Marker -> lay -> bundle chain: ek marker-e koto ply, koto piece, koto fabric
export function markerUsage(
  ratio: Record<string, number>,
  markerLengthM: number,
  lays: { plies: number; actualPlies?: number | null; status: string }[]
) {
  const planned = lays.reduce((s, l) => s + l.plies, 0);
  const cut = lays
    .filter((l) => l.status === "CUT")
    .reduce((s, l) => s + (l.actualPlies ?? l.plies), 0);
  return {
    plannedPlies: planned,
    cutPlies: cut,
    plannedPieces: layPieces(ratio, planned),
    cutPieces: layPieces(ratio, cut),
    plannedFabric: layFabric(markerLengthM, planned),
    cutFabric: layFabric(markerLengthM, cut),
  };
}