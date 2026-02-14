const STATUS_COLORS: Record<string, string> = {
  pass: "#4c1",
  warn: "#dfb317",
  fail: "#e05d44",
};
const UNKNOWN_COLOR = "#9f9f9f";
const LABEL_COLOR = "#555";

const STATUS_LABELS: Record<string, string> = {
  pass: "pass",
  warn: "warn",
  fail: "fail",
};

export function renderBadge(status: "pass" | "warn" | "fail" | null): string {
  const label = "skscan";
  const value = status ? STATUS_LABELS[status] : "unknown";
  const color = status ? STATUS_COLORS[status] : UNKNOWN_COLOR;

  const labelWidth = label.length * 6.5 + 10;
  const valueWidth = value.length * 6.5 + 10;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="${LABEL_COLOR}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text aria-hidden="true" x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
}
