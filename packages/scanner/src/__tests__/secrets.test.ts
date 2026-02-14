import { describe, it, expect } from "vitest";
import { scanSkill } from "../scanner.js";
import type { SkillFile } from "../types.js";

function scan(files: SkillFile[]) {
  return scanSkill(files).findings.filter((f) => f.category === "secrets");
}

describe("secrets rules", () => {
  describe("secrets/aws-key", () => {
    it("detects AWS access key", () => {
      const findings = scan([
        { path: "config.ts", content: 'const key = "AKIAIOSFODNN7EXAMPLE";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/aws-key")).toBe(true);
    });

    it("does not trigger on partial match", () => {
      const findings = scan([
        { path: "config.ts", content: 'const key = "AKIA_short";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/aws-key")).toBe(false);
    });
  });

  describe("secrets/github-token", () => {
    it("detects ghp_ token", () => {
      const findings = scan([
        { path: "env.ts", content: `const token = "ghp_${"a".repeat(36)}";` },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/github-token")).toBe(true);
    });

    it("detects ghs_ token", () => {
      const findings = scan([
        { path: "env.ts", content: `const token = "ghs_${"b".repeat(36)}";` },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/github-token")).toBe(true);
    });

    it("does not trigger on short token", () => {
      const findings = scan([
        { path: "env.ts", content: 'const token = "ghp_short";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/github-token")).toBe(false);
    });
  });

  describe("secrets/generic-api-key", () => {
    it("detects api_key= assignment", () => {
      const findings = scan([
        { path: "config.js", content: 'api_key = "sk_live_12345678901234567890"' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/generic-api-key")).toBe(true);
    });

    it("detects API_KEY: assignment", () => {
      const findings = scan([
        { path: "config.yml", content: 'API_KEY: abcdefghij1234567890abcdefghij' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/generic-api-key")).toBe(true);
    });

    it("does not trigger on short values", () => {
      const findings = scan([
        { path: "config.js", content: 'api_key = "short"' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/generic-api-key")).toBe(false);
    });
  });

  describe("secrets/private-key", () => {
    it("detects RSA private key", () => {
      const findings = scan([
        { path: "key.pem", content: "-----BEGIN RSA PRIVATE KEY-----" },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/private-key")).toBe(true);
    });

    it("detects OPENSSH private key", () => {
      const findings = scan([
        { path: "id_ed25519", content: "-----BEGIN OPENSSH PRIVATE KEY-----" },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/private-key")).toBe(true);
    });

    it("does not trigger on public key", () => {
      const findings = scan([
        { path: "key.pub", content: "-----BEGIN PUBLIC KEY-----" },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/private-key")).toBe(false);
    });
  });

  describe("secrets/slack-token", () => {
    it("detects xoxb- bot token", () => {
      const findings = scan([
        { path: "slack.ts", content: 'const token = "xoxb-1234567890-abcdefghij";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/slack-token")).toBe(true);
    });

    it("detects xoxp- user token", () => {
      const findings = scan([
        { path: "slack.ts", content: 'const token = "xoxp-1234567890-abcdefghij";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/slack-token")).toBe(true);
    });

    it("does not trigger on random string", () => {
      const findings = scan([
        { path: "test.ts", content: 'const x = "not-a-token";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/slack-token")).toBe(false);
    });
  });

  describe("secrets/high-entropy", () => {
    it("detects high entropy string", () => {
      const findings = scan([
        { path: "config.ts", content: 'const salt = "xK9mQ2pL7vR4wY6nJ3tB8cF5gH1dA0eS";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/high-entropy")).toBe(true);
    });

    it("does not trigger on low entropy string", () => {
      const findings = scan([
        { path: "config.ts", content: 'const msg = "aaaaaaaaaaaaaaaaaaaaa";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/high-entropy")).toBe(false);
    });

    it("skips URLs", () => {
      const findings = scan([
        { path: "config.ts", content: 'const url = "https://example.com/a8f2k9x1m4v7b3n6p0q5w8e2";' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/high-entropy")).toBe(false);
    });
  });

  describe("secrets/password-assignment", () => {
    it("detects password = literal", () => {
      const findings = scan([
        { path: "auth.ts", content: 'password = "supersecret123"' },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/password-assignment")).toBe(true);
    });

    it("detects pwd = literal", () => {
      const findings = scan([
        { path: "auth.py", content: "pwd = 'mysecretpass'" },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/password-assignment")).toBe(true);
    });

    it("does not trigger on password variable without assignment", () => {
      const findings = scan([
        { path: "auth.ts", content: "const password = getPassword();" },
      ]);
      expect(findings.some((f) => f.ruleId === "secrets/password-assignment")).toBe(false);
    });
  });

  describe("scope filtering", () => {
    it("skips .md files for all secret rules", () => {
      const findings = scan([
        { path: "SKILL.md", content: 'AKIAIOSFODNN7EXAMPLE\npassword = "test123456"' },
      ]);
      expect(findings).toHaveLength(0);
    });
  });
});
