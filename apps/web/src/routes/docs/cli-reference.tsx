import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/cli-reference")({
  head: () => ({
    meta: [{ title: "CLI Reference — SKVault Docs" }],
  }),
  component: CliReference,
});

function CliReference() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Documentation</p>
      <h1>CLI Reference</h1>
      <p>
        Complete reference for the <code>sk</code> command-line tool.
      </p>

      <h2>sk login</h2>
      <p>Authenticate with the SKVault registry.</p>
      <pre><code>{`sk login [--token <token>]`}</code></pre>
      <table>
        <thead>
          <tr><th>Option</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>--token &lt;token&gt;</code></td><td>Provide an API token directly (skips interactive prompt)</td></tr>
        </tbody>
      </table>
      <p>
        Without <code>--token</code>, you'll be prompted to paste a token from the dashboard.
      </p>

      <h2>sk logout</h2>
      <p>Remove stored credentials.</p>
      <pre><code>sk logout</code></pre>

      <h2>sk init</h2>
      <p>Initialize a skill project in the current directory.</p>
      <pre><code>sk init</code></pre>
      <p>
        Creates <code>skillfile.yaml</code> and updates <code>.gitignore</code> with entries
        for <code>.skills/store/</code> and <code>skillfile.lock</code>.
      </p>

      <h2>sk publish</h2>
      <p>Publish a skill to the registry.</p>
      <pre><code>{`sk publish [--dir <path>] [--version <version>] [--private]`}</code></pre>
      <table>
        <thead>
          <tr><th>Option</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>-d, --dir &lt;path&gt;</code></td><td><code>.</code></td><td>Skill directory path</td></tr>
          <tr><td><code>-v, --version &lt;version&gt;</code></td><td>From SKILL.md</td><td>Version to publish</td></tr>
          <tr><td><code>--private</code></td><td>—</td><td>Publish as a private skill</td></tr>
        </tbody>
      </table>
      <p>
        Requires a <code>SKILL.md</code> file with valid frontmatter. The directory is packaged as
        a gzipped tarball (max 5 MB) and uploaded with SHA-256 integrity verification.
      </p>

      <h2>sk add</h2>
      <p>Add a skill to your project.</p>
      <pre><code>{`sk add <owner/name[@version]>`}</code></pre>
      <p>Examples:</p>
      <pre><code>{`sk add acme/code-review          # latest version, caret range
sk add acme/code-review@1.2.0    # exact version
sk add acme/code-review@^1.0.0   # caret range`}</code></pre>
      <p>
        Downloads the skill, verifies its hash, stores it in <code>.skills/store/</code>,
        symlinks it to <code>.skills/active/</code>, updates <code>skillfile.yaml</code> and the lockfile,
        and auto-symlinks into agent directories.
      </p>

      <h2>sk install</h2>
      <p>Install all skills from <code>skillfile.yaml</code>.</p>
      <pre><code>{`sk install [--frozen]`}</code></pre>
      <table>
        <thead>
          <tr><th>Option</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>--frozen</code></td><td>Use lockfile only; fail if any skill is missing from lockfile</td></tr>
        </tbody>
      </table>

      <h2>sk update</h2>
      <p>Check for and apply available updates.</p>
      <pre><code>{`sk update [skill] [-y]`}</code></pre>
      <table>
        <thead>
          <tr><th>Argument / Option</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>[skill]</code></td><td>Update only a specific skill (owner/name or just name)</td></tr>
          <tr><td><code>-y, --yes</code></td><td>Skip confirmation prompt</td></tr>
        </tbody>
      </table>
      <p>
        Compares locked versions against available versions within your declared constraints
        and presents an update plan before applying.
      </p>

      <h2>sk rollback</h2>
      <p>Roll back a skill to its previous locally stored version.</p>
      <pre><code>{`sk rollback <skill>`}</code></pre>
      <p>
        Swaps the active symlink to the previous version found in <code>.skills/store/</code> and
        updates the lockfile.
      </p>

      <h2>sk search</h2>
      <p>Search for skills on the registry.</p>
      <pre><code>{`sk search <query> [--limit <n>] [--page <n>]`}</code></pre>
      <table>
        <thead>
          <tr><th>Option</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>-l, --limit &lt;n&gt;</code></td><td>20</td><td>Results per page</td></tr>
          <tr><td><code>-p, --page &lt;n&gt;</code></td><td>1</td><td>Page number</td></tr>
        </tbody>
      </table>

      <h2>sk diff</h2>
      <p>Show a unified diff between two versions of a skill.</p>
      <pre><code>{`sk diff <owner/name> <v1> <v2>`}</code></pre>
      <p>Example:</p>
      <pre><code>sk diff acme/code-review 1.0.0 1.1.0</code></pre>

      <h2>sk token</h2>
      <p>Manage API tokens for authentication.</p>

      <h3>sk token create</h3>
      <pre><code>{`sk token create [--name <name>] [--scopes <scopes>]`}</code></pre>
      <table>
        <thead>
          <tr><th>Option</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>-n, --name &lt;name&gt;</code></td><td>—</td><td>Token name (prompted if not provided)</td></tr>
          <tr><td><code>-s, --scopes &lt;scopes&gt;</code></td><td><code>publish,read</code></td><td>Comma-separated scopes</td></tr>
        </tbody>
      </table>
      <p>
        The token value is displayed once after creation and cannot be retrieved again.
      </p>

      <h3>sk token list</h3>
      <pre><code>sk token list</code></pre>
      <p>Lists all your API tokens with name, scopes, creation date, and last usage.</p>

      <h3>sk token revoke</h3>
      <pre><code>{`sk token revoke <id>`}</code></pre>
      <p>Permanently revokes an API token by its ID.</p>
    </>
  );
}
