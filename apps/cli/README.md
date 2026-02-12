# SKVault CLI

Command-line interface for the [SKVault](https://skvault.dev) skill registry — publish, install, and manage AI agent skills.

## Install

```bash
npm install -g skvault
```

## Quick Start

```bash
# Authenticate with your SKVault account
sk login

# Initialize a new skill project
sk init

# Add a skill to your project
sk add @owner/skill-name

# Publish your skill to the registry
sk publish
```

## Commands

| Command | Description |
|---------|-------------|
| `sk login` | Authenticate with SKVault |
| `sk logout` | Log out and clear credentials |
| `sk init` | Initialize a new skill project |
| `sk publish` | Publish a skill to the registry |
| `sk add <skill>` | Add a skill to your project |
| `sk install` | Install all skills from the lockfile |
| `sk update <skill>` | Update a skill to the latest version |
| `sk rollback <skill>` | Roll back a skill to a previous version |
| `sk search <query>` | Search the skill registry |
| `sk diff <skill>` | Show changes between installed and latest version |
| `sk token` | Manage API tokens |

## Documentation

Full documentation available at [skvault.dev/docs](https://skvault.dev/docs).

## License

MIT
