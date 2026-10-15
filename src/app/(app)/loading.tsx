export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-24 rounded bg-muted" />
      <div className="h-64 rounded bg-muted" />
    </div>
  );
}