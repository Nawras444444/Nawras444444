---
name: "threejs-repo-dev"
description: "Use when working in the mrdoob/three.js repo: building, running lint and unit tests, editing src, examples, or docs, or preparing a PR."
---

# three.js repo development

three.js is a cross-browser JavaScript library for 3D graphics with WebGL and WebGPU. The repo has no CLAUDE.md or AGENTS.md. Use this skill, the contributor guide in `.github/CONTRIBUTING.md`, and the PR template in `.github/pull_request_template.md`.

## Setup and commands

Use npm here, not yarn or bun. The lockfile is `package-lock.json`.

```bash
npm ci                 # install dependencies (first time, or after lockfile changes)
npm start              # dev server at http://localhost:8080, rebuilds build/three.module.js on src changes
npm run build          # rollup build into build/
npm run lint           # eslint src (the default lint step)
npm run lint-fix       # auto-fix lint errors across all lint targets
npm run test-unit      # headless puppeteer unit tests (UnitTests.html)
npm run test-unit-addons   # unit tests for examples/jsm addons
npm run test           # lint + test-unit + test-unit-addons
npm run test-e2e       # full E2E suite (slow, installs about 200 MB of Chromium; mainly run by CI)
npm run test-e2e-webgpu
npm run make-tsl-reference # regenerate TSL reference output
```

For a focused lint pass, use `npm run lint-core`, `lint-addons`, `lint-examples`, `lint-editor`, `lint-manual`, `lint-test`, `lint-utils`, or `lint-tsl`.

The contributor guide says `npm run test` must pass before a PR. Do not treat a PR as ready if lint or unit tests fail because of your change.

## Layout

- `src/`: the core library. This is what ships as `build/three.module.js`.
- `examples/`: runnable demos. `examples/jsm/` holds addons (controls, loaders, postprocessing, and so on).
- `editor/`: the browser-based scene editor.
- `tsl/`: Three Shading Language.
- `test/`: unit tests (`test/unit`), E2E tests (`test/e2e`), and benchmarks.
- `manual/`: the manual. `docs/`: API docs, built with jsdoc through `npm run build-docs`.
- `utils/`: build, dev server, and doc tooling.
- `devtools/`, `files/`, `icon.png`: supporting assets.

## Code style

- `.editorconfig`: LF line endings, final newline, tabs for `.js`, `.ts`, and `.html`, and no trailing whitespace in JS and TS.
- ESLint is the authority (`eslint.config.js`, based on `eslint-config-mdcs`). Run `npm run lint-fix`, then check what remains by hand.
- Keep the library lean. Core changes in `src/` should not add dependencies or bloat the bundle.
- Use strict equality and `const` or `let`. Use arrow callbacks, named exports, and JSDoc on public API.

## Changes and PRs

- Start from `dev`, not `main`. Create a separate branch for each patch or feature. The guide asks for one feature per branch.
- Do not commit build files.
- Feature changes may need an example. Add a screenshot when you add an example, since E2E tests use the screenshot. Simple features can go into an existing example.
- If you change existing code, run the relevant examples to check for breakage and performance regressions.
- Assets in examples must have a license that permits use here. Large assets are unlikely to be accepted.
- Reference related issues with `#number` in commit messages.
- Use a draft PR when the work is not ready for `dev`.
- For a new feature, consider asking first, through an issue, whether it fits the library.

## Docs

The docs and manual have English source. Other languages can be copied from the English text. When a change alters the public API, update the matching JSDoc and manual page in the same PR.

## Scope note

The project is maintained mostly on spare time, so maintainer review may be slow.