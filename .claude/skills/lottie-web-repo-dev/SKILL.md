---
name: "lottie-web-repo-dev"
description: "Use when working in the airbnb/lottie-web repo: building the player, linting player/js, running the snapshot comparison tests, or editing the renderers or expressions."
---

# lottie-web repo development

lottie-web (`lottie-web` on npm, currently 5.13.0) renders After Effects animations exported as JSON by Bodymovin. It runs in the browser and supports SVG, canvas, and HTML renderers. The repo has no CLAUDE.md or AGENTS.md. Use this skill, the README, and `CHANGELOG.md`.

## Commands

The repo uses npm and `package.json`. No lockfile is committed, so `npm install` resolves fresh dependencies.

```bash
npm install            # install dependencies
npm run lint           # eslint ./player/js/**/*
npm run lint:fix       # eslint with --fix
npm run build          # lint, then rollup -c, then tasks/build_worker
npm run build_test     # node tasks/build.js
npm run test:create    # render snapshots of test/animations/*.json into screenshots/create (uses puppeteer, express)
npm run test:compare   # render again into screenshots/compare, and pixel-diff against create (pixelmatch)
```

The CI workflow (`.github/workflows/testAnimations.yml`) runs on every pull request. It runs `npm install`, then `test:create`, then `build`, then `test:compare`. Reproduce this order locally before you open a PR.

`main` in `package.json` points to `./build/player/lottie.js`. Consumers use the built files, so run `npm run build` before you test a change against a consumer.

## Layout

- `player/js/`: source. Subdirectories: `animation/`, `effects/`, `elements/`, `renderers/`, `utils/`, `modules/`, and `3rd_party/`. Top-level files include `main.js`, `module.js`, `mask.js`, `EffectsManager.js`, and `worker_wrapper.js`.
- `build/`: generated output. Do not hand-edit it.
- `test/index.js`: the snapshot harness. The animation list is in `test/animations/`, and each entry specifies `renderer: 'svg'` or `'canvas'`.
- `demo/`, `docs/`, `projects/`: demos, documentation, and example projects.
- `index.d.ts`: hand-maintained TypeScript types. Update it when you change public API.
- `tasks/`: build helper scripts.
- `.eslintrc.json`, `.babelrc.json`, `rollup.config.js`: lint and build config.

## Changes

- Keep changes in `player/js/`, then rebuild. Do not edit `build/`.
- Run `npm run lint` before each commit. Use `lint:fix` for mechanical fixes.
- Add a snapshot animation to `test/animations/` when you change rendering output. Run `test:create` on the base branch, then `test:compare` on your branch. Investigate any pixel diff before you accept it.
- Add an entry to `CHANGELOG.md` at the top, under a new `## V x.y.z` heading, in the existing format. Each line starts with `- FIX:`, `- FEATURE:`, or `- IMPROVEMENT:`.
- Update `index.d.ts` when public methods, options, or event names change.
- Avoid server-side rendering breakage. The rollup config is set up to keep the player out of SSR contexts, so do not add top-level `window` or `document` access in shared modules.

## Issues

The `ISSUE_TEMPLATE.md` asks for the browser and version, the After Effects version, steps to reproduce, and a download link to the JSON. Ask for those details before you debug a rendering report. Do not guess the reproduction.