const statusConfig = {
  pass: { color: "bg-emerald-400", glow: "shadow-[0_0_6px_oklch(0.72_0.19_162)]", label: "Passed" },
  warn: { color: "bg-amber-400", glow: "shadow-[0_0_6px_oklch(0.80_0.18_84)]", label: "Warning" },
  fail: { color: "bg-red-400", glow: "shadow-[0_0_6px_oklch(0.65_0.25_27)]", label: "Failed" },
} as const;

export function ScanStatusDot({
  status,
  className,
}: {
  status: "pass" | "warn" | "fail" | null | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        className={`inline-block size-2 rounded-full bg-muted-foreground/20 ${className ?? ""}`}
        title="No scan"
      />
    );
  }

  const config = statusConfig[status];
  return (
    <span
      className={`inline-block size-2 rounded-full ${config.color} ${config.glow} ${className ?? ""}`}
      title={config.label}
    />
  );
}
