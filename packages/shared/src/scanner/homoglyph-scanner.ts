import type { ScanFinding, SkillFile } from "./types.js";

// Cyrillic characters that visually resemble Latin letters
const CYRILLIC_LOOKALIKES = new Set([
  "\u0430", // а (looks like a)
  "\u0441", // с (looks like c)
  "\u0435", // е (looks like e)
  "\u043E", // о (looks like o)
  "\u0440", // р (looks like p)
  "\u0445", // х (looks like x)
  "\u0443", // у (looks like y)
  "\u0455", // ѕ (looks like s)
]);

// Greek characters that visually resemble Latin letters
const GREEK_LOOKALIKES = new Set([
  "\u03BF", // ο (omicron, looks like o)
  "\u03B1", // α (alpha, looks like a)
  "\u0391", // Α (capital alpha, looks like A)
  "\u0392", // Β (capital beta, looks like B)
  "\u0395", // Ε (capital epsilon, looks like E)
  "\u0397", // Η (capital eta, looks like H)
  "\u0399", // Ι (capital iota, looks like I)
  "\u039A", // Κ (capital kappa, looks like K)
  "\u039C", // Μ (capital mu, looks like M)
  "\u039D", // Ν (capital nu, looks like N)
  "\u039F", // Ο (capital omicron, looks like O)
  "\u03A1", // Ρ (capital rho, looks like P)
  "\u03A4", // Τ (capital tau, looks like T)
  "\u03A5", // Υ (capital upsilon, looks like Y)
  "\u03A7", // Χ (capital chi, looks like X)
  "\u0396", // Ζ (capital zeta, looks like Z)
]);

const LATIN_LETTER = /[a-zA-Z]/;
const URL_PATTERN = /https?:\/\/[^\s]+/g;

export function scanHomoglyphs(files: SkillFile[]): ScanFinding[] {
  const findings: ScanFinding[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check URLs for homoglyph characters first
      const urls = line.match(URL_PATTERN);
      if (urls) {
        for (const url of urls) {
          if (containsHomoglyph(url)) {
            findings.push({
              severity: "critical",
              type: "hidden-content",
              category: "network",
              file: file.path,
              line: lineNum,
              detail: "URL contains homoglyph characters (IDN homograph attack)",
              snippet: truncateSnippet(line),
            });
          }
        }
      }

      // Check for mixed Latin + Cyrillic on the same line
      let hasLatin = false;
      let hasCyrillic = false;
      let hasGreek = false;

      for (const ch of line) {
        if (LATIN_LETTER.test(ch)) hasLatin = true;
        if (CYRILLIC_LOOKALIKES.has(ch)) hasCyrillic = true;
        if (GREEK_LOOKALIKES.has(ch)) hasGreek = true;
      }

      if (hasLatin && hasCyrillic) {
        findings.push({
          severity: "critical",
          type: "hidden-content",
          category: "permissions",
          file: file.path,
          line: lineNum,
          detail:
            "Mixed Latin and Cyrillic scripts detected (homoglyph attack)",
          snippet: truncateSnippet(line),
        });
      }

      if (hasLatin && hasGreek) {
        findings.push({
          severity: "critical",
          type: "hidden-content",
          category: "permissions",
          file: file.path,
          line: lineNum,
          detail:
            "Mixed Latin and Greek scripts detected (homoglyph attack)",
          snippet: truncateSnippet(line),
        });
      }
    }
  }

  return findings;
}

function containsHomoglyph(str: string): boolean {
  for (const ch of str) {
    if (CYRILLIC_LOOKALIKES.has(ch) || GREEK_LOOKALIKES.has(ch)) return true;
  }
  return false;
}

function truncateSnippet(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > 120 ? trimmed.slice(0, 120) + "..." : trimmed;
}
