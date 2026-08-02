# ReviewStack

Automatic AI code reviews for every git commit — saved as searchable project history under `.reviewstack/`.

```text
git commit -m "Add payment API"
        ↓
AI reviews the commit diff
        ↓
.reviewstack/commits/<hash>/review.md
        ↓
Sidebar → Commit History
```

## Features

- **Auto-review on commit** — runs after `git commit` while VS Code is open
- **Commit History sidebar** — browse past reviews with status icons
- **On-disk history** — each review is a markdown file you can open anytime
- **Diff-only reviews** — sends the commit changes, not your whole repository
- **Enable / Disable** — turn automatic reviews on or off without uninstalling

Branch switches, checkouts, merges, and rebases do **not** trigger auto-review.

## Requirements

- VS Code 1.90 or later (or a compatible editor with the Language Model API)
- A **Language Model** provider, typically [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat), signed in
- A **git repository** folder open as your workspace

## Getting started

1. Install **ReviewStack** from the Extensions view.
2. Open a git repo folder in VS Code.
3. Make sure Copilot Chat (or another LM provider) works in that window.
4. Click the **ReviewStack** icon in the Activity Bar.
5. Either:
   - Commit your changes (`git commit -m "…"`), or
   - Run **ReviewStack: Review Last Commit** from the Command Palette
6. Allow Language Model access if prompted.
7. Open the review from **Commit History**, or from `.reviewstack/commits/<hash>/review.md`.

## Commands

| Command | Description |
|---|---|
| **ReviewStack: Review Last Commit** | Review the current `HEAD` commit now |
| **ReviewStack: Open Reviews Folder** | Reveal the `.reviewstack` folder on disk |
| **ReviewStack: Enable** | Turn reviews on |
| **ReviewStack: Disable** | Turn reviews off |

## Where reviews are stored

```text
.reviewstack/
  config.json
  index.json
  commits/
    a1b2c3d/
      metadata.json
      review.md
```

### Settings (`.reviewstack/config.json`)

```json
{
  "enabled": true,
  "autoOpenReview": true,
  "maxDiffBytes": 200000
}
```

| Setting | Meaning |
|---|---|
| `enabled` | Master switch for reviews |
| `autoOpenReview` | Automatically open `review.md` after an auto-review |
| `maxDiffBytes` | Max diff size sent to the model (larger diffs are truncated) |

## Privacy

- Only the **commit diff** and commit metadata (message, author, hash) are sent to the Language Model — not your entire repo.
- Review files are written **locally** under `.reviewstack/`. Commit or gitignore that folder based on your team’s preference.

## Troubleshooting

| Problem | What to try |
|---|---|
| “No language model available” | Install/enable GitHub Copilot Chat, sign in, and send a message in Chat once |
| Auto-review did nothing | Keep VS Code open; use `git commit` (not checkout); check `enabled` in `config.json` |
| Can’t open a review | Wait until status is completed; pending/failed items have no `review.md` yet |
| Extension doesn’t seem active | Open a **folder** workspace (not a single file) |

## License

MIT
