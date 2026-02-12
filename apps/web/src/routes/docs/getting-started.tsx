import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/docs/getting-started")({
  head: () => ({
    meta: [{ title: "Getting Started — SKVault Docs" }],
  }),
  component: GettingStarted,
});

function GettingStarted() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Documentation</p>
      <h1>Getting Started</h1>
      <p>
        SKVault is a package manager for AI agent skills. It lets you publish, discover, and install
        reusable skill files that AI agents like Claude and Cursor can use — with built-in security scanning.
      </p>

      <h2>Install the CLI</h2>
      <p>Install the <code>sk</code> CLI globally with npm:</p>
      <pre><code>npm install -g skvault</code></pre>
      <p>Verify the installation:</p>
      <pre><code>sk --version</code></pre>

      <h2>Authenticate</h2>
      <p>
        Log in with an API token. You can create one from the <strong>Dashboard &gt; Tokens</strong> page,
        or pass it directly:
      </p>
      <pre><code>{`# Interactive — opens a prompt for your token
sk login

# Non-interactive — pass a token directly
sk login --token sk_live_abc123`}</code></pre>
      <p>
        The CLI stores your credentials locally in <code>~/.skvault/config.yaml</code>.
        Run <code>sk logout</code> to remove them.
      </p>

      <h2>Initialize a project</h2>
      <p>
        In your project directory, run <code>sk init</code> to create a <code>skillfile.yaml</code>:
      </p>
      <pre><code>{`cd my-project
sk init`}</code></pre>
      <p>This creates:</p>
      <ul>
        <li><code>skillfile.yaml</code> — declares your skill dependencies</li>
        <li>Entries in <code>.gitignore</code> for <code>.skills/store/</code> and <code>skillfile.lock</code></li>
      </ul>

      <h2>Add your first skill</h2>
      <p>
        Search the registry for skills, then add one to your project:
      </p>
      <pre><code>{`sk search "code review"
sk add acme/code-review`}</code></pre>
      <p>
        This downloads the skill to <code>.skills/store/</code>, creates a symlink in <code>.skills/active/</code>,
        updates <code>skillfile.yaml</code> and the lockfile, and symlinks the skill into any detected
        agent directories (e.g. <code>.claude/skills/</code>, <code>.cursor/skills/</code>).
      </p>

      <h2>Project structure</h2>
      <p>After initializing and adding skills, your project looks like this:</p>
      <pre><code>{`my-project/
├── .skills/
│   ├── active/          # symlinks to installed skills
│   │   └── code-review → ../store/a1b2c3.../
│   └── store/           # content-addressed skill storage
│       └── a1b2c3.../
│           ├── SKILL.md
│           └── ...
├── .claude/
│   └── skills/          # auto-symlinked for Claude
│       └── code-review → ../../.skills/active/code-review
├── skillfile.yaml       # your skill dependencies
└── skillfile.lock       # locked versions + hashes`}</code></pre>

      <h2>Next steps</h2>
      <ul>
        <li>Learn how to <a href="/docs/publishing">publish your own skills</a></li>
        <li>Understand <a href="/docs/installing">version resolution and installation</a></li>
        <li>See the full <a href="/docs/cli-reference">CLI reference</a></li>
      </ul>
    </>
  );
}
