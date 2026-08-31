# pi-approve-diffs

Pre-apply approval gate for [pi](https://pi.dev)'s `write` / `edit` / `hashline_edit` tools, with
Shiki syntax-highlighted, word-emphasized diffs (vendored from
[@heyhuynhgiabuu/pi-diff](https://github.com/buddingnewinsights/pi-diff), MIT).

Nothing touches disk before you decide:

- **Enter / y** — approve
- **a** — approve and stop asking for the rest of the session (yolo)
- **Esc / n** — decline (agent sees the block reason)
- **s** — steer: decline and type guidance the agent must follow instead
- **Tab** — toggle split / unified view
- **↑ ↓ k j / PgUp PgDn / Home End** — scroll

Command: `/approve-diff on|off|toggle|yolo|status` (persisted in
`~/.pi/agent/extensions/pi-approve-diffs.json`).

## Install (local)

```bash
pi install /Users/franciszeklatala/Projects/pi-approve-diffs
```

or add the absolute path to the `packages` array in `~/.pi/agent/settings.json`, then `/reload`.

## Dev

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run check       # assert-based self-check of the vendored renderer
pi -e ./src/index.ts
```

## Push to GitHub (private)

```bash
gh repo create pi-approve-diffs --private --source=. --push
```

## License

MIT — see LICENSE. The vendored renderer keeps its upstream MIT notice.
