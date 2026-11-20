---
name: "hyperframes-repo-dev"
description: "Use when working in the heygen-com/hyperframes monorepo: building, testing, linting, adding CLI commands, editing skills or docs, or contributing a PR."
---

# HyperFrames monorepo development

HyperFrames is an open-source video rendering framework: you write HTML and it renders video. This is a Bun workspace monorepo. Use bun, not pnpm or npm, for workspace operations. Never create `pnpm-lock.yaml`.

## Commands

```bash
bun install            # install dependencies
bun run build          # build all packages (run once in a fresh worktree before tests or typecheck)
bun run dev            # run the studio (composition editor)
bun run test           # unit tests across all packages
bun run --filter '*' typecheck
bun run lint           # oxlint plus repo contract checks
bun run format:check   # oxfmt --check
```

Run one test file with `bun run --cwd packages/<pkg> test <path>`. Producer is the exception: a file that imports `bun:test` runs with `bun test <file>`, and any other file runs with `bunx vitest run <file>`.

Packages load each other through their `exports`. Under Node, core, parsers, lint and studio-server resolve to `dist/`. After you edit a package that another package imports, rebuild that package before running the dependent package's tests. If you see `Cannot find module '../generated/runtime-inline'`, run `bun run build:hyperframes-runtime`.

Lint and format with oxlint and oxfmt. Do not use eslint, prettier, or biome:

```bash
node_modules/.bin/oxlint <files>
node_modules/.bin/oxfmt <files>
```

Lefthook pre-commit hooks enforce lint and format. Lint and format changed files before committing.

## Composition validation

After creating or editing any composition `.html` file, both of these must pass before you preview or call the work done:

```bash
npx hyperframes lint   # static HTML structure check
npx hyperframes check  # headless Chrome gate: runtime errors, layout, motion, WCAG contrast
```

## Package layout

- `packages/cli`: the `hyperframes` CLI (create, preview, lint, render)
- `packages/core`: types, parsers, generators, linter, runtime, frame adapters
- `packages/engine`: seekable page-to-video capture (Puppeteer + FFmpeg)
- `packages/producer`: full render pipeline (capture, encode, audio mix)
- `packages/player`: embeddable `<hyperframes-player>` web component
- `packages/shader-transitions`: WebGL shader transitions
- `packages/studio`: browser composition editor. Read `packages/studio/AGENTS.md` first.
- `registry/blocks`, `registry/components`, `registry/examples`: installable scenes, effects, and starter templates
- `docs/`: Mintlify docs site
- `skills/`: published agent skill source

## Conventions

- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
- Avoid `any` and `as T`. Prefer type guards and narrowing. Allowed casts are `as const`, and `as unknown as T` at hard boundaries such as untrusted JSON or postMessage, each with a one-line justification comment.
- Avoid `!` non-null assertions unless a guard clause already checked the value.
- Compositions: HTML with `data-*` attributes. Clips need `class="clip"`. Register one paused GSAP root timeline per composition on `window.__timelines`. Scene timelines added to that root must not be paused, or they will not advance when the root is seeked.
- Rendering must be deterministic. Do not use `Date.now()`, unseeded `Math.random()`, or network fetches at render time.
- Comments explain the reason, invariant, or non-obvious constraint. Do not repeat the code. Do not describe history, such as "used to" or "PR #123". Do not leave commented-out code. Mark unfinished work as `TODO(owner):` or `TODO(#issue):`.
- A PR that adds or changes a CLI command, flag, or user-visible behavior must update `docs/` in the same PR. A new command also goes in "Find your command" in `docs/packages/cli.mdx`, which CI checks.

## Skills

This repo ships agent skills in `skills/`. The core set is `/hyperframes`, `/hyperframes-cli`, `/hyperframes-registry`, `/media-use`, `/reverse-any-video`, and `/style-sampling`. The on-demand set is `/figma`, `/slideshow`, and `/remotion-to-hyperframes`.

- Install the core set with `npx hyperframes skills update`. Install all skills only when the user explicitly asks.
- Never run `npx skills add ... --all` inside this checkout. It deletes existing `skills/<name>` directories, and uncommitted work there cannot be recovered.
- Run project-local `npx skills add` from a separate directory.
- When you add a skill or change a skill's `description:`, update every discovery surface in the same change: the skill list in `CLAUDE.md` and `AGENTS.md`, the `## Skills` section in `README.md`, `docs/guides/skills.mdx`, `docs/prompting/overview.mdx`, `docs/quickstart.mdx`, and the scaffold templates at `packages/cli/src/templates/_shared/CLAUDE.md` and `AGENTS.md`. The two template files must stay byte-identical. Also check the core-set list in `packages/cli/src/utils/skillsManifest.ts` and `.claude-plugin/marketplace.json`. The skill's own SKILL.md `description:` is the source of truth for the one-line blurb.

## Issues and PRs

Before you classify an issue, advertise contribution work, or triage a PR, read `TRIAGE.md`. Check current source and overlapping PRs first. Keep difficulty, readiness, and ownership separate.

Before you start on an issue, check for an existing assignee or open PR. Comment with your intended approach and coordinate with a maintainer. Discuss substantial features and public API or default changes before you implement them. Tiny, self-contained corrections can go straight to a PR, with the problem and verification explained.

Run `bun run lint` and `bun run test` before you call a change ready. Run `npx hyperframes lint` and `check` on any composition you touched.