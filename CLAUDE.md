# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Repository layout

Pengui is split across three sibling repositories, all checked out next to each other:

| Path | Repo | Contents |
| --- | --- | --- |
| `.` | `pengui` | Application code (Next.js app, Rust crates, tests, deployment) |
| `../pengui-backlog` | `pengui-backlog` | Tasks, bugs, decisions and milestones (Backlog.md) |
| `../pengui-wiki` | `pengui-wiki` | Architecture, development and testing documentation |

This repo holds code only. Documentation belongs in the wiki, work items belong in the backlog —
do not re-create a `docs/` folder here.

## Tasks, bugs and milestones — `../pengui-backlog`

All tasks, bugs and milestones are tracked with the [Backlog.md](https://github.com/MrLesk/Backlog.md)
CLI in `../pengui-backlog`. Look there whenever the user mentions a task ID (`task-042`) or a
milestone, asks what is in progress or what comes next on the roadmap, or asks you to pick up /
record work. Milestones define delivery order (for example Sage Wallet Integration, then Loans as
Offers, then Circuit Loans); check a task's milestone before starting it.

Run `backlog` commands **from `../pengui-backlog`**, not from this repo:

```bash
cd ../pengui-backlog && backlog task list --plain
cd ../pengui-backlog && backlog task 42 --plain
cd ../pengui-backlog && backlog milestone list --plain
cd ../pengui-backlog && backlog task list -m m-1 --plain   # tasks in one milestone
cd ../pengui-backlog && backlog search "sage" --plain
```

At the start of a conversation that touches backlog work, run `backlog instructions overview`
first, and the matching detailed guide before lifecycle actions:

- `backlog instructions task-creation` — creating or splitting tasks
- `backlog instructions task-execution` — planning, status/assignee changes, implementation notes
- `backlog instructions task-finalization` — acceptance criteria, summaries, terminal statuses

Never edit the markdown files under `../pengui-backlog/.backlog/` by hand; use the CLI so metadata
and history stay consistent. Use `--plain` for machine-readable output, and `backlog <cmd> --help`
for unfamiliar commands.

## Documentation — `../pengui-wiki`

Project documentation lives in `../pengui-wiki` (index in its `README.md`):

- `architecture/` — `overview.md` (routes, providers, state, feature flags, WASM), `fsd-structure.md`,
  `wallet-integration.md` (WalletConnect + Sage today, commands used, abstraction seam),
  `sage-in-app-integration.md` (m-0 design), `loans-and-option-contracts.md` (m-1),
  `splash-pengenius-integration.md`
- `development/` — `workflow.md` (three repos, Backlog.md, branches, bun scripts, env, CI, deploy),
  `git-hooks.md`, `build-optimizations.md`, `infinite-loop-guardrails.md`, WalletConnect notes
- `testing/` — overview, writing, unit, integration, E2E and component test guides
- `request-collections/` — Bruno collections for dexie.space and Spacescan

Read `architecture/overview.md` first when orienting in the codebase.

Read the wiki before answering architecture or testing questions, and when a change makes a
document stale, update it in `../pengui-wiki` rather than adding docs to this repo. The wiki is its
own git repo — commit and push it separately.

## Working in this repo

- Package manager is **bun** (`bun install`, `bun run dev`, `bun run lint`, `bun run type-check`,
  `bun run test:unit`).
- Source follows Feature-Sliced Design under `src/` — see the FSD guide in the wiki before adding
  new modules or crossing layer boundaries.
- The husky pre-commit hook builds the project and runs lint/format on changed files; do not
  bypass it without being asked.
