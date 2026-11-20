---
name: "animejs-repo-dev"
description: "Use when working in the juliangarnier/anime (Anime.js) repo: building, editing src JSDoc types, running browser or node tests, adding tests, or preparing a PR."
---

# Anime.js repo development

Anime.js (`animejs` on npm) is a JavaScript animation library. The source is plain JavaScript with JSDoc annotations. TypeScript declaration files (`index.d.ts`) are generated from those annotations, so they are not hand-written. The repo has no CLAUDE.md or AGENTS.md. Use this skill and `CONTRIBUTING.md`.

## Setup and commands

Use npm. The lockfile is `package-lock.json`.

```bash
npm i                  # install dependencies (CONTRIBUTING says npm i)
npm run dev            # rollup watch + tsc types, rebuilds on changes in src/
npm run build          # clean rebuild of dist/ (rollup) plus generated types
npm run test:browser   # browser-sync test runner at tests/index.html, watches dist/ and tests/suites/
npm run test:node      # mocha tests in tests/suites/node.test.js
npm run dev:test       # dev watcher plus browser tests together
npm run open:examples  # browser-sync server for examples/
npm run typecheck      # tsc on src, tests, and examples
npm run typecheck:tests
npm run typecheck:examples
```

Note: `CONTRIBUTING.md` names `npm run dev-types` and `npm run test-browser`. Neither script exists in `package.json`. Use `npm run dev` and `npm run test:browser`, and mention the mismatch in the PR if it matters.

## Layout

- `src/`: the library source, JavaScript with JSDoc. Global JSDoc types are in `src/types.js`. Other types go in the file that uses them.
- `dist/`: build output (`dist/modules/`, `anime.esm.js`, and the generated types). Rebuild it before browser tests.
- `tests/`: `tests/index.html` runs browser suites from `tests/suites/`. `tests/suites/node.test.js` runs under mocha. Note that `CONTRIBUTING.md` writes the path as `/test/suites/`, but the directory is `tests/`.
- `examples/`: runnable demos.
- `rollup.config.js`, `tsconfig*.json`: build and type config.

## Workflow

1. A PR needs an associated bug report or feature proposal issue. If none exists, open one first. The `CONTRIBUTING.md` says PRs that skip this will be closed.
2. Edit or add `.js` files in `src/` with valid JSDoc. Types come from those annotations.
3. Run `npm run dev` while you work so `dist/` and the type files stay current.
4. Add tests to the relevant file in `tests/suites/`.
5. Run `npm run test:browser`, and `npm run test:node` for node-relevant changes, until everything passes.
6. Run `npm run typecheck` before you open the PR.
7. Open the PR against the `dev` branch, not `main`.

## Code and docs

- Keep the library small. Anime.js ships to end users, so favor concise code.
- Write JSDoc on exported API. The generated `index.d.ts` depends on it.
- Do not hand-edit `dist/` or the generated types. Regenerate them with the build.
- Questions go in a Q&A discussion, not an issue. Documentation-only changes use the documentation update issue template.