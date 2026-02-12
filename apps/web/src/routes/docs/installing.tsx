import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/installing")({
  head: () => ({
    meta: [{ title: "Installing — SKVault Docs" }],
  }),
  component: Installing,
});

function Installing() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Documentation</p>
      <h1>Installing</h1>
      <p>
        Install skills into your project with <code>sk add</code> or restore all dependencies
        with <code>sk install</code>.
      </p>

      <h2>Adding a skill</h2>
      <p>
        Use <code>sk add</code> with the full skill name (<code>owner/name</code>):
      </p>
      <pre><code>{`sk add acme/code-review`}</code></pre>
      <p>
        This resolves the latest version, downloads and verifies the tarball via SHA-256 hash, extracts it
        to the content-addressed store, and updates your <code>skillfile.yaml</code> and lockfile.
      </p>

      <h2>Pinning a version</h2>
      <p>
        Append <code>@version</code> to pin a specific version or range:
      </p>
      <pre><code>{`# Exact version
sk add acme/code-review@1.2.0

# Caret range (default when no version specified)
sk add acme/code-review@^1.0.0

# Tilde range
sk add acme/code-review@~1.2.0`}</code></pre>
      <p>
        When you run <code>sk add</code> without a version, it defaults to a caret range pinned to the
        latest version (e.g. <code>^1.2.3</code>), allowing compatible updates.
      </p>

      <h2>Version resolution</h2>
      <p>SKVault supports these version constraint formats:</p>
      <table>
        <thead>
          <tr>
            <th>Format</th>
            <th>Example</th>
            <th>Resolves to</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Exact</td>
            <td><code>1.2.3</code></td>
            <td>Only 1.2.3</td>
          </tr>
          <tr>
            <td>Caret</td>
            <td><code>^1.2.3</code></td>
            <td>&gt;=1.2.3 &lt;2.0.0</td>
          </tr>
          <tr>
            <td>Tilde</td>
            <td><code>~1.2.3</code></td>
            <td>&gt;=1.2.3 &lt;1.3.0</td>
          </tr>
          <tr>
            <td>Range</td>
            <td><code>&gt;=1.0.0 &lt;2.0.0</code></td>
            <td>Explicit range</td>
          </tr>
        </tbody>
      </table>

      <h2>Installing all dependencies</h2>
      <p>
        To install all skills listed in <code>skillfile.yaml</code>:
      </p>
      <pre><code>sk install</code></pre>
      <p>
        This reads the lockfile first. If a locked version satisfies the constraint, it reuses it.
        Otherwise, it resolves the latest matching version from the registry.
      </p>

      <h3>Frozen installs</h3>
      <p>
        For reproducible builds (e.g. in CI), use <code>--frozen</code> to install strictly from the lockfile:
      </p>
      <pre><code>sk install --frozen</code></pre>
      <p>
        This fails if any skill in <code>skillfile.yaml</code> is missing from the lockfile, ensuring
        exact version reproducibility.
      </p>

      <h2>Updating skills</h2>
      <p>
        Check for newer versions that satisfy your constraints and update:
      </p>
      <pre><code>{`# Check all skills
sk update

# Update a specific skill
sk update acme/code-review

# Skip confirmation prompt
sk update -y`}</code></pre>

      <h2>Rolling back</h2>
      <p>
        If an update causes issues, roll back to the previously installed version:
      </p>
      <pre><code>sk rollback acme/code-review</code></pre>
      <p>
        This swaps the symlink to the previous version stored locally and updates the lockfile.
      </p>

      <h2>Directory structure</h2>
      <p>
        Installed skills live in <code>.skills/</code>:
      </p>
      <pre><code>{`.skills/
├── active/          # symlinks to current versions
│   ├── code-review → ../store/a1b2c3.../
│   └── linting → ../store/d4e5f6.../
└── store/           # content-addressed storage (by SHA-256 hash)
    ├── a1b2c3.../
    └── d4e5f6.../`}</code></pre>
      <p>
        The CLI also auto-symlinks skills into detected agent directories
        like <code>.claude/skills/</code> and <code>.cursor/skills/</code>, so your AI agents
        can find them immediately.
      </p>
    </>
  );
}
