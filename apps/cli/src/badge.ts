import type { ScanStatus } from "@skvault/scanner";

const COLORS: Record<ScanStatus, string> = {
  pass: "#4c1",
  warn: "#dfb317",
  fail: "#e05d44",
};

const LABELS: Record<ScanStatus, string> = {
  pass: "pass",
  warn: "warn",
  fail: "fail",
};

export function generateBadge(status: ScanStatus): string {
  const color = COLORS[status];
  const label = LABELS[status];
  const labelWidth = 48;
  const valueWidth = 40;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="skscan: ${label}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelWidth * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">skscan</text>
    <text x="${labelWidth * 5}" y="140" transform="scale(.1)">skscan</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${label}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)">${label}</text>
  </g>
</svg>`;
}
