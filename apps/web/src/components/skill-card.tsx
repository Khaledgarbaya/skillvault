import { Link } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { ScanStatusDot } from "./scan-status-dot";
import { formatDownloads, formatRelativeTime } from "~/lib/format";

type SkillCardProps = {
  ownerUsername: string;
  name: string;
  description: string | null;
  downloadCount: number;
  latestVersion: string | null;
  scanStatus: "pass" | "fail" | "warn" | null | undefined;
  updatedAt: Date;
};

export function SkillCard({
  ownerUsername,
  name,
  description,
  downloadCount,
  latestVersion,
  scanStatus,
  updatedAt,
}: SkillCardProps) {
  return (
    <Link
      to="/skills/$owner/$name"
      params={{ owner: ownerUsername, name }}
      className="group block"
    >
      <div className="relative rounded-xl border border-border/50 bg-card/50 p-5 transition-all duration-200 hover:border-primary/20 hover:bg-card">
        {/* Hover glow */}
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        <div className="relative">
          {/* Title row */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <h3 className="font-mono text-sm font-semibold leading-tight">
              <span className="text-muted-foreground">{ownerUsername}/</span>
              <span className="text-foreground group-hover:text-primary transition-colors duration-200">{name}</span>
            </h3>
            <ScanStatusDot status={scanStatus} />
          </div>

          {/* Description */}
          {description && (
            <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60">
            {latestVersion && (
              <Badge variant="secondary" className="h-5 rounded border-border/50 px-1.5 font-mono text-[10px] font-normal">
                v{latestVersion}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              {formatDownloads(downloadCount)}
            </span>
            <span>{formatRelativeTime(updatedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
