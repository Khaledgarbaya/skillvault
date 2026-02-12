import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/skillfile-reference")({
  head: () => ({
    meta: [{ title: "Skillfile Reference — SKVault Docs" }],
  }),
  component: SkillfileReference,
});

function SkillfileReference() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Documentation</p>
      <h1>Skillfile Reference</h1>
      <p>
        SKVault uses three file formats: <code>skillfile.yaml</code> for declaring dependencies,
        <code>SKILL.md</code> for skill metadata, and <code>skillfile.lock</code> for pinning exact versions.
      </p>

      <h2>skillfile.yaml</h2>
      <p>
        The dependency manifest for your project. Created by <code>sk init</code>, updated
        by <code>sk add</code>.
      </p>
      <pre><code>{`skills:
  acme/code-review: "^1.2.0"
  acme/linting: "~2.0.0"
  bob/testing: "1.0.0"`}</code></pre>
      <p>Schema:</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Type</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>skills</code></td>
            <td><code>Record&lt;string, string&gt;</code></td>
            <td>Map of <code>owner/name</code> to version constraint</td>
          </tr>
        </tbody>
      </table>
      <p>
        Version constraints follow semver range syntax: exact (<code>1.2.3</code>), caret
        (<code>^1.2.3</code>), tilde (<code>~1.2.3</code>), or explicit
        range (<code>&gt;=1.0.0 &lt;2.0.0</code>).
      </p>

      <h2>SKILL.md</h2>
      <p>
        The metadata and content file for a publishable skill. Must be at the root of the skill directory.
        Uses YAML frontmatter followed by markdown content:
      </p>
      <pre><code>{`---
name: code-review
description: "Automated code review with best practices"
version: 1.0.0
private: false
---

# Code Review Skill

This skill provides automated code review capabilities...`}</code></pre>

      <h3>Frontmatter fields</h3>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Required</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>name</code></td>
            <td>Yes</td>
            <td>Skill name: lowercase, numbers, hyphens, 3-50 chars</td>
          </tr>
          <tr>
            <td><code>description</code></td>
            <td>Yes</td>
            <td>Short description of the skill</td>
          </tr>
          <tr>
            <td><code>version</code></td>
            <td>No</td>
            <td>Semver version (alternative to <code>--version</code> flag)</td>
          </tr>
          <tr>
            <td><code>private</code></td>
            <td>No</td>
            <td>Set to <code>true</code> to restrict visibility</td>
          </tr>
        </tbody>
      </table>
      <p>
        The markdown body after the frontmatter is the actual skill content that AI agents read and use.
      </p>

      <h2>skillfile.lock</h2>
      <p>
        The lockfile pins exact resolved versions and content hashes. Generated automatically
        by <code>sk add</code> and <code>sk install</code>. Commit this file to ensure reproducible installs.
      </p>
      <pre><code>{`version: 1
skills:
  acme/code-review:
    owner: acme
    name: code-review
    version: 1.2.3
    hash: a1b2c3d4e5f6...
    resolved: /api/v1/skills/acme/code-review/1.2.3/dl
  acme/linting:
    owner: acme
    name: linting
    version: 2.0.1
    hash: f6e5d4c3b2a1...
    resolved: /api/v1/skills/acme/linting/2.0.1/dl`}</code></pre>

      <h3>Lock entry fields</h3>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>owner</code></td>
            <td>Skill owner username</td>
          </tr>
          <tr>
            <td><code>name</code></td>
            <td>Skill name</td>
          </tr>
          <tr>
            <td><code>version</code></td>
            <td>Exact resolved version</td>
          </tr>
          <tr>
            <td><code>hash</code></td>
            <td>SHA-256 hash of the tarball (used for integrity verification)</td>
          </tr>
          <tr>
            <td><code>resolved</code></td>
            <td>Download URL path used to fetch the tarball</td>
          </tr>
        </tbody>
      </table>

      <h2>Package limits</h2>
      <table>
        <thead>
          <tr>
            <th>Limit</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Max tarball size (compressed)</td>
            <td>5 MB</td>
          </tr>
          <tr>
            <td>Max decompressed size</td>
            <td>50 MB</td>
          </tr>
          <tr>
            <td>Max files per package</td>
            <td>1,000</td>
          </tr>
          <tr>
            <td>Max file size</td>
            <td>10 MB</td>
          </tr>
          <tr>
            <td>Max file path length</td>
            <td>512 characters</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
