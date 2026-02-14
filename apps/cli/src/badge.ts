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
  const iconWidth = 16;
  const labelWidth = 48;
  const valueWidth = 40;
  const totalWidth = iconWidth + labelWidth + valueWidth;
  const labelCenter = iconWidth + labelWidth / 2;
  const valueCenter = iconWidth + labelWidth + valueWidth / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="skscan: ${label}">
  <title>skscan: ${label}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${iconWidth + labelWidth}" height="20" fill="#1a1a1a"/>
    <rect x="${iconWidth + labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g transform="translate(4, 2)">
    <text font-family="'Courier New',monospace" font-size="12" font-weight="700" fill="#4ade80" y="12">$</text>
    <path d="M11.5 4 L7.5 8 L11.5 12" fill="none" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelCenter}" y="15" fill="#010101" fill-opacity=".3">skscan</text>
    <text x="${labelCenter}" y="14">skscan</text>
    <text aria-hidden="true" x="${valueCenter}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${valueCenter}" y="14">${label}</text>
  </g>
</svg>`;
}
