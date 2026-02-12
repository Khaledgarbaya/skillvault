import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/publishing")({
  head: () => ({
    meta: [{ title: "Publishing — SKVault Docs" }],
  }),
  component: Publishing,
});

function Publishing() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Documentation</p>
      <h1>Publishing</h1>
      <p>
        Publish your AI agent skills to the SKVault registry so others can discover and install them.
        Each skill is a directory with a <code>SKILL.md</code> file that contains metadata as YAML frontmatter.
      </p>

      <h2>SKILL.md frontmatter</h2>
      <p>
        Every skill requires a <code>SKILL.md</code> file at the root of the skill directory.
        The frontmatter defines the skill's metadata:
      </p>
      <pre><code>{`---
name: code-review
description: "Automated code review with best practices"
version: 1.0.0
private: false
---

# Code Review

Instructions for the AI agent go here...`}</code></pre>
      <p>Required fields:</p>
      <ul>
        <li><code>name</code> — lowercase letters, numbers, and hyphens only (3-50 chars)</li>
        <li><code>description</code> — a short summary of the skill</li>
      </ul>
      <p>Optional fields:</p>
      <ul>
        <li><code>version</code> — semver version (can also be passed via <code>--version</code> flag)</li>
        <li><code>private</code> — set to <code>true</code> to restrict visibility</li>
      </ul>

      <h2>Publishing a skill</h2>
      <p>From the skill directory, run:</p>
      <pre><code>{`sk publish`}</code></pre>
      <p>You can also specify options:</p>
      <pre><code>{`# Publish from a different directory
sk publish --dir ./my-skill

# Specify version explicitly
sk publish --version 1.2.0

# Publish as private
sk publish --private`}</code></pre>
      <p>
        The CLI packages all files in the directory (excluding <code>node_modules</code>, <code>.git</code>,
        <code>.skills</code>, and OS junk files) into a compressed tarball, then uploads it to the registry.
        The maximum package size is 5 MB compressed.
      </p>

      <h2>First publish</h2>
      <p>
        On first publish, if the skill doesn't exist in the registry yet, the CLI will automatically create it
        before uploading. The skill is registered under your username: <code>your-username/skill-name</code>.
      </p>

      <h2>Versions</h2>
      <p>
        SKVault uses strict semver (<code>MAJOR.MINOR.PATCH</code>). Each version is immutable — you cannot
        overwrite a published version. To update, bump the version number and publish again.
      </p>
      <pre><code>{`sk publish --version 1.0.0   # initial release
sk publish --version 1.0.1   # patch fix
sk publish --version 1.1.0   # minor feature
sk publish --version 2.0.0   # breaking change`}</code></pre>

      <h2>Visibility</h2>
      <p>
        Skills default to <strong>public</strong> visibility. Public skills appear in search results and can be
        installed by anyone. To make a skill private, use the <code>--private</code> flag or set
        <code>private: true</code> in the SKILL.md frontmatter.
      </p>
      <p>
        See <a href="/docs/private-skills">Private Skills</a> for details on access control.
      </p>

      <h2>Security scanning</h2>
      <p>
        Every published version is automatically scanned for security issues. You'll see the scan result
        immediately after publishing:
      </p>
      <pre><code>{`✔ Published code-review@1.0.0
  Scan: ✓ pass`}</code></pre>
      <p>
        Learn more about <a href="/docs/scanning">what's scanned and scan statuses</a>.
      </p>
    </>
  );
}
