import { Badge } from "~/components/ui/badge";
import { ScanStatusDot } from "./scan-status-dot";

type ScanData = {
  status: "pending" | "running" | "completed" | "failed";
  overallStatus: "pass" | "fail" | "warn" | null;
  secretsStatus: "pass" | "fail" | "warn" | null;
  secretsFindings: string | null;
  permissionsStatus: "pass" | "fail" | "warn" | null;
  permissionsFindings: string | null;
  networkStatus: "pass" | "fail" | "warn" | null;
  networkFindings: string | null;
  filesystemStatus: "pass" | "fail" | "warn" | null;
  filesystemFindings: string | null;
  engineVersion: string;
  createdAt: Date;
};

const statusBadge = {
  pass: "default" as const,
  warn: "secondary" as const,
  fail: "destructive" as const,
};

function parseFindings(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return raw.split("\n").filter(Boolean);
  }
}

function CategoryCard({
  title,
  status,
  findings,
  icon,
}: {
  title: string;
  status: "pass" | "fail" | "warn" | null;
  findings: string | null;
  icon: React.ReactNode;
}) {
  const items = parseFindings(findings);
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-muted-foreground/40">{icon}</span>
          <span className="text-[13px] font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <ScanStatusDot status={status} />
          {status && (
            <Badge variant={statusBadge[status]} className="h-5 text-[10px]">
              {status === "pass" ? "Pass" : status === "warn" ? "Warn" : "Fail"}
            </Badge>
          )}
        </div>
      </div>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 font-mono text-xs leading-relaxed text-muted-foreground">
              <span className="mt-1.5 block size-1 shrink-0 rounded-full bg-muted-foreground/30" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ScanReport({ scan }: { scan: ScanData | null }) {
  if (!scan) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/20 py-10 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-muted-foreground/30">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
        <p className="text-sm text-muted-foreground/50">No scan results available.</p>
      </div>
    );
  }

  if (scan.status === "pending" || scan.status === "running") {
    return (
      <div className="rounded-xl border border-border/50 bg-card/20 py-10 text-center">
        <div className="mx-auto mb-3 size-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground/50">
          Scan is {scan.status}...
        </p>
      </div>
    );
  }

  if (scan.status === "failed") {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Scan failed. Please try publishing again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall status */}
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/30 px-5 py-3.5">
        <ScanStatusDot status={scan.overallStatus} className="size-3" />
        <span className="text-sm font-medium">
          {scan.overallStatus === "pass"
            ? "All checks passed"
            : scan.overallStatus === "warn"
              ? "Passed with warnings"
              : "Issues found"}
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/40">
          engine v{scan.engineVersion}
        </span>
      </div>

      {/* Category cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <CategoryCard
          title="Secrets"
          status={scan.secretsStatus}
          findings={scan.secretsFindings}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" /><path d="m21 2-9.6 9.6" /><circle cx="7.5" cy="15.5" r="5.5" />
            </svg>
          }
        />
        <CategoryCard
          title="Permissions"
          status={scan.permissionsStatus}
          findings={scan.permissionsFindings}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
        />
        <CategoryCard
          title="Network"
          status={scan.networkStatus}
          findings={scan.networkFindings}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
            </svg>
          }
        />
        <CategoryCard
          title="Filesystem"
          status={scan.filesystemStatus}
          findings={scan.filesystemFindings}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
