import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/private-skills")({
  head: () => ({
    meta: [{ title: "Private Skills — SKVault Docs" }],
  }),
  component: PrivateSkills,
});

function PrivateSkills() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Documentation</p>
      <h1>Private Skills</h1>
      <p>
        Private skills are only visible to and installable by their owner. They don't appear in
        search results or the public explore page. Use them for proprietary workflows, internal
        tooling, or skills still in development.
      </p>

      <h2>Publishing a private skill</h2>
      <p>
        Set the <code>--private</code> flag when publishing:
      </p>
      <pre><code>sk publish --private</code></pre>
      <p>
        Or add <code>private: true</code> to your SKILL.md frontmatter:
      </p>
      <pre><code>{`---
name: internal-review
description: "Internal code review standards"
version: 1.0.0
private: true
---`}</code></pre>

      <h2>Token authentication</h2>
      <p>
        To install private skills, the CLI must be authenticated. All API requests include
        your token via the <code>Authorization: Bearer</code> header. The registry verifies
        ownership before allowing access.
      </p>
      <p>
        For CI/CD or non-interactive environments, create a dedicated API token:
      </p>
      <pre><code>{`sk token create --name "ci-deploy" --scopes "read"`}</code></pre>
      <p>
        Then authenticate with it:
      </p>
      <pre><code>sk login --token sk_live_your_token_here</code></pre>

      <h2>Managing tokens</h2>
      <p>
        View and manage your API tokens:
      </p>
      <pre><code>{`# List all tokens
sk token list

# Create a token with specific scopes
sk token create --name "deploy" --scopes "publish,read"

# Revoke a token by ID
sk token revoke tkn_abc123`}</code></pre>
      <p>
        Available scopes:
      </p>
      <ul>
        <li><code>read</code> — download and install skills</li>
        <li><code>publish</code> — publish new versions</li>
      </ul>

      <h2>CI/CD usage</h2>
      <p>
        For automated environments, store your token as an environment variable and pass it
        to the login command:
      </p>
      <pre><code>{`# In your CI config
sk login --token $SKVAULT_TOKEN
sk install --frozen`}</code></pre>
      <p>
        Use <code>--frozen</code> in CI to ensure reproducible installs from the lockfile.
      </p>

      <h2>Visibility and badges</h2>
      <p>
        Private skill badges return a generic "not found" response to unauthenticated requests,
        preventing information leakage. Only the skill owner sees the real scan status badge.
      </p>
    </>
  );
}
