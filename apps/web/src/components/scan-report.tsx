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
  description,
  status,
  findings,
  icon,
}: {
  title: string;
  description: string;
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
      <p className="mt-1.5 pl-[26px] text-[11px] leading-relaxed text-muted-foreground/40">
        {description}
      </p>
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

function ScanCategoryGrid({ scan }: { scan: ScanData }) {
  return (
    <>
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
          description="API keys, tokens, passwords, and hardcoded credentials"
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
          description="Privilege escalation, sudo, chmod, and environment manipulation"
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
          description="Outbound HTTP requests, external URLs, and data exfiltration"
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
          description="Path traversal, dangerous file ops, and persistence mechanisms"
          status={scan.filesystemStatus}
          findings={scan.filesystemFindings}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
          }
        />
      </div>
    </>
  );
}

function AiScanSection({ aiScan }: { aiScan: ScanData | null }) {
  if (aiScan === null) return null;

  const aiFindings = aiScan.status === "completed"
    ? [
        ...parseFindings(aiScan.secretsFindings),
        ...parseFindings(aiScan.permissionsFindings),
        ...parseFindings(aiScan.networkFindings),
        ...parseFindings(aiScan.filesystemFindings),
      ]
    : [];

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 p-4">
      <div className="flex items-center gap-2.5">
        <span className="text-muted-foreground/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" /><path d="M22 5h-4" />
          </svg>
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium">AI-Powered Analysis</span>
            <div className="flex items-center gap-2">
              {(aiScan.status === "pending" || aiScan.status === "running") && (
                <div className="flex items-center gap-2">
                  <div className="size-3 animate-spin rounded-full border-[1.5px] border-primary/30 border-t-primary" />
                  <span className="text-[11px] text-muted-foreground/50">
                    {aiScan.status === "pending" ? "Queued" : "Running"}...
                  </span>
                </div>
              )}
              {aiScan.status === "failed" && (
                <span className="text-[11px] text-muted-foreground/40">Could not complete</span>
              )}
              {aiScan.status === "completed" && (
                <>
                  <ScanStatusDot status={aiScan.overallStatus} />
                  {aiScan.overallStatus && (
                    <Badge variant={statusBadge[aiScan.overallStatus]} className="h-5 text-[10px]">
                      {aiScan.overallStatus === "pass" ? "Pass" : aiScan.overallStatus === "warn" ? "Warn" : "Fail"}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/40">
            LLM-based deep analysis for prompt injection, social engineering, and encoded threats
          </p>
        </div>
      </div>
      {aiFindings.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
          {aiFindings.map((item, i) => (
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

export function ScanReport({ scan, aiScan }: { scan: ScanData | null; aiScan?: ScanData | null }) {
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
    <div className="space-y-6">
      {/* Pattern-Based Scan */}
      <div className="space-y-4">
        <div className="mb-3">
          <h3 className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            Pattern-Based Scan
          </h3>
          <p className="mt-1 pl-[22px] text-[11px] text-muted-foreground/30">
            Regex analysis for known dangerous patterns, obfuscation, and homoglyph attacks
          </p>
        </div>
        <ScanCategoryGrid scan={scan} />
      </div>

      {/* AI-Powered Analysis */}
      {aiScan !== undefined && <AiScanSection aiScan={aiScan} />}
    </div>
  );
}
