# ReviewStack

**Automatic AI code reviews for every git commit** — stored as searchable project history, not a chat you forget.

ReviewStack watches your repo (while VS Code is open). When you run `git commit`, it reviews the **commit diff only**, then saves a markdown review under `.reviewstack/commits/<hash>/`.

```text
git commit -m "Add payment API"
        ↓
ReviewStack (AI via VS Code Language Model API)
        ↓
.reviewstack/commits/a1b2c3d/review.md
        ↓
Sidebar → Commit History
```

## Features

- **Auto-review on commit** — only real `git commit` / amend (not branch switch, checkout, merge, rebase)
- **Manual review** — Command Palette → **ReviewStack: Review Last Commit**
- **Commit History sidebar** — status icons, relative dates, open any past review
- **On-disk history** — `review.md` + `metadata.json` + `index.json` (migration-style artifact)
- **Enable / Disable** — toggle without uninstalling

## Requirements

- VS Code **1.90+** (or a compatible editor that supports the Language Model API)
- A **Language Model** provider, typically **[GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat)** signed in
- A **git repository** folder open in the workspace

> ReviewStack does **not** host its own AI backend. Reviews use the model available in your editor (e.g. Copilot). Diff content is sent to that model.

## Install

### From VSIX (local / testing)

1. Build the package (see [Development](#development)).
2. In VS Code: **Extensions** → `…` → **Install from VSIX…**
3. Choose the generated `reviewstack-*.vsix` file.
4. Reload the window.

### From Marketplace (when published)

Search for **ReviewStack** in the Extensions view, or install from the Marketplace listing.

## Quick start

1. Open a git repo folder in VS Code.
2. Ensure Copilot Chat (or another LM provider) works in that window.
3. Click the **ReviewStack** icon in the Activity Bar.
4. Either:
   - Make a commit (`git commit -m "…"`), or
   - Run **ReviewStack: Review Last Commit**
5. Allow Language Model access if prompted.
6. Open the new review from **Commit History** or `.reviewstack/commits/`.

## Commands

| Command | Description |
|---|---|
| `ReviewStack: Review Last Commit` | Review `HEAD` now |
| `ReviewStack: Open Reviews Folder` | Reveal `.reviewstack` on disk |
| `ReviewStack: Enable` | Turn reviews on (`config.json`) |
| `ReviewStack: Disable` | Turn reviews off |

## Storage layout

```text
.reviewstack/
  config.json
  index.json
  commits/
    a1b2c3d/
      metadata.json
      review.md
```

### `config.json`

```json
{
  "enabled": true,
  "autoOpenReview": true,
  "maxDiffBytes": 200000
}
```

| Field | Meaning |
|---|---|
| `enabled` | Master switch for reviews |
| `autoOpenReview` | Open `review.md` after an auto-review |
| `maxDiffBytes` | Truncate large diffs before sending to the model |

### Privacy

- Only the **commit diff** (plus commit metadata) is sent to the Language Model — not the whole repository.
- Reviews are written **locally** under `.reviewstack/`. Commit or gitignore that folder based on your team policy.
- Branch switches and checkouts do **not** trigger auto-review.

## Development

```bash
git clone https://github.com/Alen-Sabu/ReviewStackExtension.git
cd ReviewStackExtension
npm install
npm run compile
```

Press **F5** to launch the Extension Development Host.

Useful scripts:

| Script | Purpose |
|---|---|
| `npm run watch` | Rebuild on change |
| `npm run compile` | Typecheck + lint + bundle |
| `npm run vsix` | Create a `.vsix` for local install |
| `npm run publish:marketplace` | Publish (requires publisher login) |

## Publish to the VS Code Marketplace

### 1. Create a publisher

1. Open [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage).
2. Sign in with the Microsoft account you want to own the extension.
3. Create a publisher whose **ID** matches `publisher` in `package.json` (currently `reviewstack`).
4. Keep that ID — changing it later requires republishing under a new name.

### 2. Create an Azure DevOps Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com/) → User settings → **Personal access tokens**.
2. Create a token with **Marketplace → Manage** scope (or Custom → Marketplace).
3. Copy the token (shown once).

### 3. Login and publish

```bash
npm install
npm run compile
npx vsce login reviewstack
# paste PAT when prompted

npm run vsix
# optional: install the .vsix locally and smoke-test

npm run publish:marketplace
# or: npx vsce publish
```

Bump `version` in `package.json` before each release (`0.1.0` → `0.1.1`, etc.).

### 4. Optional: Open VSX (Cursor / other editors)

```bash
npx ovsx publish reviewstack-*.vsix -p <OPEN_VSX_TOKEN>
```

Create a token at [open-vsx.org](https://open-vsx.org/).

## Troubleshooting

| Issue | What to try |
|---|---|
| No language model available | Install/enable Copilot Chat; sign in; try Chat once in that window |
| Auto-review did nothing | Window must be open; action must be `git commit` (not checkout); check `enabled` in config |
| Could not open review.md | Row may be pending/failed — only completed reviews open; wait for AI to finish |
| Extension not activating | Open a **folder** workspace (not a single file) |

## License

MIT — see [LICENSE](LICENSE).
