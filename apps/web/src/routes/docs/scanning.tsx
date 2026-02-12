import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/scanning")({
  head: () => ({
    meta: [{ title: "Security Scanning — SKVault Docs" }],
  }),
  component: Scanning,
});

function Scanning() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Documentation</p>
      <h1>Security Scanning</h1>
      <p>
        Every skill version published to SKVault goes through a two-phase security scan.
        Results are visible on the skill detail page, in CLI output, and through embeddable badges.
      </p>

      <h2>Two-phase scanning</h2>
      <p>
        SKVault uses two complementary approaches to maximize detection coverage:
      </p>

      <h3>Phase 1 — Pattern-based scan</h3>
      <p>
        Runs <strong>synchronously during publish</strong>. Uses regex pattern matching and
        heuristic analysis to detect known threats. Results are available immediately in CLI
        output and on the web. This phase checks all files in the published package.
      </p>

      <h3>Phase 2 — AI-powered analysis</h3>
      <p>
        Runs <strong>asynchronously after publish</strong> via a background queue. An LLM reads
        the skill's markdown content and analyzes it for sophisticated threats that regex can't
        catch — like natural-language prompt injection disguised as helpful instructions, or
        multi-step social engineering. Usually completes within 10–30 seconds.
      </p>

      <h2>What gets scanned</h2>
      <p>
        Findings are grouped into four categories. Both scan phases report into the same
        categories, but detect different kinds of threats within each.
      </p>

      <h3>Secrets</h3>
      <p>Detects credentials and sensitive data that should not be in published code:</p>
      <ul>
        <li>API keys and tokens (AWS, GitHub, Stripe, OpenAI, Slack, etc.)</li>
        <li>Hardcoded passwords and connection strings</li>
        <li>Private keys and certificates</li>
        <li>Generic high-entropy secrets (<code>secret=</code>, <code>password=</code> patterns)</li>
      </ul>

      <h3>Permissions</h3>
      <p>Detects attempts to escalate privileges or manipulate the host environment:</p>
      <ul>
        <li>Privilege escalation — <code>sudo</code>, <code>chmod 777</code>, <code>chmod +s</code> (setuid), <code>chown root</code></li>
        <li>Environment manipulation — overwriting <code>PATH</code>, <code>LD_PRELOAD</code>, <code>DYLD_LIBRARY_PATH</code></li>
        <li>Persistence mechanisms — modifying <code>~/.bashrc</code>, <code>~/.zshrc</code>, <code>~/.profile</code>, crontab entries</li>
        <li>System-level persistence — LaunchAgents/LaunchDaemons (macOS), systemd units (Linux), git hooks</li>
        <li>Obfuscated code — hex escape sequences, char-by-char string concatenation to hide dangerous commands</li>
        <li>Homoglyph attacks — Cyrillic or Greek lookalike characters mixed with Latin text to disguise malicious identifiers</li>
      </ul>

      <h3>Network</h3>
      <p>Detects outbound communication that could exfiltrate data or fetch malicious payloads:</p>
      <ul>
        <li>HTTP requests in code — <code>fetch()</code>, <code>axios</code>, <code>requests.get()</code>, <code>urllib.request</code></li>
        <li>Suspicious URL patterns in markdown or configuration</li>
        <li>IDN homograph attacks — URLs containing lookalike Unicode characters (e.g. using Cyrillic "а" instead of Latin "a")</li>
      </ul>

      <h3>Filesystem</h3>
      <p>Detects dangerous file system operations that go beyond normal skill behavior:</p>
      <ul>
        <li>Path traversal attempts — <code>../</code> sequences, absolute paths outside expected directories</li>
        <li>Dangerous operations — <code>rm -rf</code>, recursive deletion, overwriting system files</li>
        <li>Prompt injection — instructions embedded in markdown that attempt to manipulate AI agents into executing commands</li>
      </ul>

      <h3>AI-specific detections</h3>
      <p>
        The AI-powered phase analyzes markdown files specifically for threats that are
        difficult to express as regex patterns:
      </p>
      <ul>
        <li>Natural-language prompt injection — "ignore previous instructions", "you are now a different AI"</li>
        <li>Role-play framing — instructions disguised as creative writing or examples</li>
        <li>Multilingual injection — dangerous instructions written in non-English languages</li>
        <li>Encoded instructions — base64 or other encodings hiding malicious content</li>
        <li>Indirect injection — multi-step social engineering that builds trust before the payload</li>
        <li>Markdown rendering tricks — exploiting how markdown is rendered to hide or reveal content</li>
      </ul>

      <h2>Scan statuses</h2>
      <p>Each scan produces one of three statuses per category, plus an overall status:</p>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>pass</code></td>
            <td>No issues detected. The skill is considered safe to use.</td>
          </tr>
          <tr>
            <td><code>warn</code></td>
            <td>Potential issues found (medium severity). Review the findings before using in production.</td>
          </tr>
          <tr>
            <td><code>fail</code></td>
            <td>Security issues detected (high/critical severity). The skill should not be used without addressing the findings.</td>
          </tr>
        </tbody>
      </table>
      <p>
        The overall status is the worst status across all four categories — if any category
        fails, the overall status is <code>fail</code>.
      </p>

      <h2>Severity levels</h2>
      <p>Individual findings have severity levels that determine category status:</p>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Category status</th>
            <th>Examples</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>low</code></td>
            <td>pass</td>
            <td>Informational findings, potential false positives</td>
          </tr>
          <tr>
            <td><code>medium</code></td>
            <td>warn</td>
            <td>Network requests in code, git hook modifications</td>
          </tr>
          <tr>
            <td><code>high</code></td>
            <td>fail</td>
            <td>Exposed API keys, <code>sudo</code> usage, path traversal, prompt injection</td>
          </tr>
          <tr>
            <td><code>critical</code></td>
            <td>fail</td>
            <td>Setuid chmod, homoglyph attacks, <code>LD_PRELOAD</code> manipulation</td>
          </tr>
        </tbody>
      </table>

      <h2>Viewing scan results</h2>
      <p>
        Scan results appear in several places:
      </p>
      <ul>
        <li>In the CLI output immediately after publishing (pattern-based results)</li>
        <li>On the <strong>Security</strong> tab of the skill detail page (both phases)</li>
        <li>On skill cards in search results and the explore page (overall status dot)</li>
        <li>Via the badge API endpoint</li>
      </ul>

      <h2>Badges</h2>
      <p>
        Embed a scan status badge in your README or documentation using the badge URL:
      </p>
      <pre><code>{`https://skvault.dev/api/v1/skills/{owner}/{name}/badge`}</code></pre>
      <p>Markdown example:</p>
      <pre><code>{`![SKVault Scan](https://skvault.dev/api/v1/skills/acme/code-review/badge)`}</code></pre>
      <p>HTML example:</p>
      <pre><code>{`<img src="https://skvault.dev/api/v1/skills/acme/code-review/badge" alt="SKVault Scan" />`}</code></pre>
      <p>
        Badges are SVG images and are cached for 5 minutes. Private skill badges return a
        generic "not found" response to unauthenticated requests.
      </p>
    </>
  );
}
