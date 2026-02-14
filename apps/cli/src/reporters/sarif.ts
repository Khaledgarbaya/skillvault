import type { ScanResult, ScanFinding, FindingSeverity } from "@skvault/scanner";

interface SarifRule {
  id: string;
  shortDescription: { text: string };
  defaultConfiguration: { level: string };
}

const SEVERITY_TO_LEVEL: Record<FindingSeverity, string> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "note",
};

const RULES: SarifRule[] = [
  // secrets
  { id: "secrets/aws-key", shortDescription: { text: "AWS access key ID detected" }, defaultConfiguration: { level: "error" } },
  { id: "secrets/github-token", shortDescription: { text: "GitHub token detected" }, defaultConfiguration: { level: "error" } },
  { id: "secrets/generic-api-key", shortDescription: { text: "Generic API key assignment detected" }, defaultConfiguration: { level: "error" } },
  { id: "secrets/private-key", shortDescription: { text: "Private key detected" }, defaultConfiguration: { level: "error" } },
  { id: "secrets/slack-token", shortDescription: { text: "Slack token detected" }, defaultConfiguration: { level: "error" } },
  { id: "secrets/password-assignment", shortDescription: { text: "Password assignment detected" }, defaultConfiguration: { level: "error" } },
  { id: "secrets/high-entropy", shortDescription: { text: "High-entropy string detected" }, defaultConfiguration: { level: "warning" } },
  // dangerous-code
  { id: "dangerous-code/eval-js", shortDescription: { text: "Dynamic code evaluation detected" }, defaultConfiguration: { level: "error" } },
  { id: "dangerous-code/eval-py", shortDescription: { text: "Python dynamic code execution detected" }, defaultConfiguration: { level: "error" } },
  { id: "dangerous-code/subprocess-shell", shortDescription: { text: "Shell command execution detected" }, defaultConfiguration: { level: "error" } },
  { id: "dangerous-code/curl-pipe", shortDescription: { text: "Remote code piped to shell detected" }, defaultConfiguration: { level: "error" } },
  { id: "dangerous-code/rm-rf", shortDescription: { text: "Destructive rm -rf detected" }, defaultConfiguration: { level: "error" } },
  { id: "dangerous-code/chmod-777", shortDescription: { text: "World-writable permissions detected" }, defaultConfiguration: { level: "warning" } },
  { id: "dangerous-code/sensitive-file-read", shortDescription: { text: "Sensitive file access detected" }, defaultConfiguration: { level: "error" } },
  { id: "dangerous-code/child-process", shortDescription: { text: "Dynamic subprocess execution detected" }, defaultConfiguration: { level: "warning" } },
  // prompt-override
  { id: "prompt-override/ignore-instructions", shortDescription: { text: "Prompt override: ignore previous instructions" }, defaultConfiguration: { level: "error" } },
  { id: "prompt-override/role-change", shortDescription: { text: "Prompt override: role reassignment attempt" }, defaultConfiguration: { level: "error" } },
  { id: "prompt-override/forget", shortDescription: { text: "Prompt override: forget everything" }, defaultConfiguration: { level: "error" } },
  { id: "prompt-override/disregard", shortDescription: { text: "Prompt override: disregard directive" }, defaultConfiguration: { level: "error" } },
  { id: "prompt-override/override", shortDescription: { text: "Prompt override: system prompt override attempt" }, defaultConfiguration: { level: "error" } },
  { id: "prompt-override/no-restrictions", shortDescription: { text: "Prompt override: restriction removal attempt" }, defaultConfiguration: { level: "error" } },
  // exfiltration
  { id: "exfiltration/env-vars", shortDescription: { text: "Exfiltration: environment variable reference" }, defaultConfiguration: { level: "error" } },
  { id: "exfiltration/sensitive-paths", shortDescription: { text: "Exfiltration: sensitive path reference" }, defaultConfiguration: { level: "error" } },
  { id: "exfiltration/data-transmission", shortDescription: { text: "Data transmission targeting sensitive data" }, defaultConfiguration: { level: "error" } },
  { id: "exfiltration/encode-exfil", shortDescription: { text: "Encoding instruction targeting sensitive data" }, defaultConfiguration: { level: "error" } },
  // hidden-instructions
  { id: "hidden-instructions/zero-width-chars", shortDescription: { text: "Zero-width characters detected" }, defaultConfiguration: { level: "error" } },
  { id: "hidden-instructions/base64-payload", shortDescription: { text: "Long base64-encoded string detected" }, defaultConfiguration: { level: "warning" } },
  { id: "hidden-instructions/invisible-unicode", shortDescription: { text: "Invisible or confusable Unicode detected" }, defaultConfiguration: { level: "warning" } },
  { id: "hidden-instructions/html-comment-injection", shortDescription: { text: "HTML comment containing instructions detected" }, defaultConfiguration: { level: "error" } },
];

export function reportSarif(result: ScanResult): string {
  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "skscan",
            version: result.engineVersion,
            informationUri: "https://github.com/Khaledgarbaya/skillvault",
            rules: RULES,
          },
        },
        results: result.findings.map(findingToResult),
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

function findingToResult(f: ScanFinding) {
  return {
    ruleId: f.ruleId,
    level: SEVERITY_TO_LEVEL[f.severity],
    message: { text: f.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: f.file },
          region: {
            startLine: f.line,
            ...(f.column ? { startColumn: f.column } : {}),
          },
        },
      },
    ],
  };
}
