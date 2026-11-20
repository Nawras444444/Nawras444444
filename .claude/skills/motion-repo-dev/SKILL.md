---
name: "motion-repo-dev"
description: "Use when working in the motiondivision/motion monorepo (framer-motion, motion-dom, motion-utils, motion): building, testing, adding tests, bug fixes, or code style."
---

# Motion monorepo development

Yarn workspaces monorepo managed by Turborepo and Lerna. Run build and test commands from the repo root unless a step says otherwise.

## Setup and commands

- First-time setup: `make bootstrap`. Run one install at a time, in the foreground. Do not overlap `yarn install` or `make bootstrap` with other installs.
- Build all packages: `yarn build` (or `make build`). Always from the root.
- Watch: `yarn watch` (or `make watch`).
- Unit tests and type-checks: `yarn test`.
- Playwright E2E: `yarn test-playwright`.
- One package: `cd packages/framer-motion && yarn test-client` or `yarn test-server`.
- Cypress E2E: `make test-e2e`, or `make test-single` (edit the spec path in the Makefile).

## Package layout

Dependency flow: `motion-utils` -> `motion-dom` -> `framer-motion` -> `motion`.

- `motion-utils`: pure functions and easing. No dependencies.
- `motion-dom`: vanilla/JS animation engine. Framework-agnostic. Prefer new non-React logic here.
- `framer-motion`: React integration. Migrate logic to `motion-dom` where possible.
- `motion`: public re-export (`motion/react`, `motion/mini`).
- Dev apps in `dev/`: `react` (port 9990), `react-19` (9991), `next` (3000), `html` (8000).

Key folders in `packages/framer-motion/src/`: `animation/`, `components/`, `context/`, `gestures/`, `motion/`, `projection/`, `render/`, `value/`.

## Tests

Every bug fix and every new feature needs a test. Write the test first and confirm it fails for the right reason. A compile error for an API you have not written yet does not count.

- **Jest unit tests**: for pure logic. Put them in a `__tests__/` folder next to the source, named `<filename>.test.ts(x)`. JSDOM has no WAAPI (`Element.animate()`), so Jest only covers the JS animation fallback.
- **Cypress E2E**: for DOM rendering, scroll, gestures, WAAPI, opacity/transform, layout animations, lazy/Suspense. Start here for those bugs, not with a unit test.
  1. Create the test page at `dev/react/src/tests/<test-name>.tsx` exporting a named `App`. It is served at `?test=<test-name>`.
  2. Create the spec at `packages/framer-motion/cypress/integration/<test-name>.ts`.
  3. Run it against React 18 and React 19. Both must pass before a PR.
- **Playwright E2E**: vanilla JS. Pages in `dev/html/public/playwright/`, specs in `tests/`.

Cypress tips:
- Start Vite directly, not through turbo. Use a random port per server:
  `PORT=$((10000 + RANDOM % 50000)); cd dev/react && TEST_PORT=$PORT yarn vite --port $PORT &`, then `npx wait-on http://localhost:$PORT`, then `cd packages/framer-motion && cypress run --headed --config baseUrl=http://localhost:$PORT --spec cypress/integration/<name>.ts`, then kill the server. For React 19, use `dev/react-19` and add `--config-file=cypress.react-19.json`.
- Run Cypress in the foreground. Background runs produce no output.
- Use `.then()`, not `.should()`, for mid-animation measurements. `.should()` retries until the animation finishes and hides the bug.
- For target-value bugs: `transition={{ type: "tween", ease: "linear", duration: 10 }}`, wait 5s, then read `getComputedStyle()` with `.then()`.
- Use `getAnimations()` only for compositor properties (opacity, transform). Use computed style for height and width.
- Do not read pixel values from `onUpdate` when the target is a keyword like `"auto"`.
- Capture the first Cypress run output with `tail -60`. Do not re-run with different grep patterns to find errors.
- If a bug does not reproduce in the test environment after 2-3 attempts, stop. Check the browser difference, then guard defensively and note in the PR that the test is environment-specific.

Async helper for waiting one frame:

```ts
async function nextFrame() {
    return new Promise<void>((resolve) => {
        frame.postRender(() => resolve())
    })
}
```

## Bug reports

1. Read the issue first: `gh issue view <number>`. Do not infer the ask from code.
2. Check history early: `git log --grep="<keyword>" -- <file>`.
3. Use the reporter's reproduction (CodeSandbox, StackBlitz, or inline code) as the basis for the test. If you cannot get it, stop and ask. Do not guess.
4. Prefer targeted `grep` or glob searches over broad exploration. If a theory fails after 2-3 rounds, check adjacent code such as utilities, type guards, and environment checks.
5. Guard against invalid values before they reach a browser API. Do not trace every upstream path.

`gh pr edit` fails on this repo because of a GitHub Projects Classic deprecation. Do not retry or work around it. If `gh pr create` succeeded and the code is pushed, the job is done.

## Code style

- Keep file size small. This library ships to end users. Prefer concise patterns.
- Use named exports only. No default exports.
- Use `interface` for type definitions.
- Prefer optional chaining (`value?.jump()`) over `if` guards where it reads clearly.
- Prefer arrow callbacks. Use `===`. Use `const` or `let`, never `var`.
- Add a CHANGELOG.md entry in the existing format for user-facing changes.
- Use `time.now()` from `packages/motion-dom/src/frameloop/sync-time.ts` for frame-synced timestamps, not `performance.now()`.

## Contributing

For bugs, post intent on the issue before starting. For features, open a Feature Proposal issue first. Run `make bootstrap` once, then add code, tests, and a CHANGELOG entry.