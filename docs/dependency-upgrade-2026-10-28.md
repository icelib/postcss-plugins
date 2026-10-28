# Dependency upgrade audit — 2026-10-28

The audit covers the root manifest, the documentation website, all six
publishable packages, the package manager, and existing dependency overrides.
The baseline is main commit `7d6c02049ef28944aaf23607860db570b7d10da4`.
Versions were checked against npm's `latest` dist-tag on 2026-10-28.

The upgrade uses the latest stable versions that the repository's tools
support. TypeScript 7 and VitePress 2 prereleases are excluded for the
compatibility reasons below. Internal `workspace:` links, public PostCSS
peer ranges, package versions, exports, and published Node engine ranges
are preserved.

## Direct dependencies and package manager

| Dependency                                 | Before        | Target  |
| ------------------------------------------ | ------------- | ------- |
| pnpm                                       | 12.5.1        | 12.15.0 |
| repoctl                                    | 5.5.5         | 6.3.0   |
| @icebreakers/commitlint-config             | 4.1.1         | 4.1.5   |
| @icebreakers/eslint-config                 | 8.0.2         | 8.0.12  |
| @icebreakers/stylelint-config              | 5.1.2         | 5.1.5   |
| @commitlint/cli                            | 21.2.3        | 21.2.4  |
| @commitlint/config-conventional            | 21.2.3        | 21.2.4  |
| @commitlint/prompt-cli                     | 21.2.3        | 21.2.4  |
| @types/klaw                                | 3.0.7         | 3.0.8   |
| @types/lodash                              | 4.17.25       | 4.17.27 |
| @types/node                                | 26.6.2        | 26.6.5  |
| vitest and @vitest/coverage-v8             | 5.0.1         | 5.0.5   |
| conventional-changelog-conventionalcommits | 10.4.0        | 10.4.1  |
| es-toolkit                                 | 1.52.0        | 1.53.0  |
| eslint                                     | 10.11.0       | 10.13.0 |
| execa                                      | 10.0.1        | 10.2.1  |
| pkg-types                                  | 2.3.3         | 2.4.0   |
| postcss, for development and tests         | 8.5.28        | 8.5.32  |
| stylelint                                  | 17.15.0       | 17.16.0 |
| tsdown                                     | 0.23.0        | 0.23.3  |
| turbo                                      | 2.11.3        | 2.11.10 |
| wrangler                                   | 4.136.3       | 4.154.0 |
| vue, for the website                       | 3.5.43        | 3.5.44  |
| lefthook                                   | Not installed | 2.2.2   |

The existing exact, caret, or tilde declaration style is retained for these
updates. Lefthook is pinned explicitly because neither repoctl 6.3.0 nor
its implementation package declares it as a dependency or peer. Its
postinstall script is disabled with `allowBuilds.lefthook: false`; the
root `prepare` script uses `repo tooling hooks install` to install hooks.
Husky and lint-staged are removed as part of the repoctl hooks migration.

`@types/get-value` is removed. Its latest version, 4.0.1, is a deprecated
stub; `get-value` 4.1.0 already provides `index.d.ts`.

The remaining external direct dependencies already match the latest stable
version, except TypeScript's deliberate compatibility hold:

- Runtime dependencies: `defu` 6.1.7 and `@csstools/css-tokenizer` 4.0.2.
- Type packages: `@commitlint/types` 21.2.3, `@types/fs-extra` 11.0.4,
  `@types/lodash-es` 4.17.12, `@types/micromatch` 4.0.10,
  `@types/postcss-pxtorem` 6.1.0, `@types/semver` 7.8.0, and
  `@types/set-value` 4.0.3.
- Utilities: `ci-info` 4.4.0, `cross-env` 10.1.0, `fast-glob` 3.3.3,
  `fs-extra` 11.4.1, `get-value` 4.1.0, `klaw` 4.1.0,
  `lodash` and `lodash-es` 4.18.1, `micromatch` 4.0.8,
  `only-allow` 1.2.2, `pathe` 2.0.3, `rimraf` 6.1.3,
  `set-value` 4.1.0, and `yaml` 2.9.1.
- Build and test tools: `postcss-pxtorem` 6.1.0, `tailwindcss` 4.3.3,
  `tsd` 0.33.0, `tslib` 2.8.1, `tsx` 4.23.15,
  `type-fest` 5.10.0, and `vite-tsconfig-paths` 6.1.1.
- Documentation: VitePress 1.6.4.

## Compatibility constraints

repoctl 6.3.0 and the updated icebreakers configurations require Node
`^22.23.4 || ^24.22.1 || >=26.12.1`. The root development engine follows
that declaration. Published package engine requirements are separate and
are unchanged. CI continues to exercise Node 22 and Node 24.

An existing engine metadata inconsistency remains separate from this tooling
upgrade: `postcss-rem-to-responsive-pixel` declares Node `>=16.6.0`, but its
`postcss-rule-unit-converter` dependency declares `>=20.19.0`. A build target
of Node 16 does not establish support for that entire dependency graph.
Changing published engine contracts requires a separate compatibility decision;
the new root development requirements are not copied into package manifests.

TypeScript remains at **6.0.3**, the latest stable 6.x release. Although
the `latest` dist-tag is 7.0.2, repoctl's peer range only accepts
`^5.0.0 || ^6.0.0`. TypeScript 7 also changes the compiler implementation
and public module exports, so globally forcing it would bypass tool
compatibility declarations. The existing global 6.0.3 override is retained
to keep compiler consumers on the supported implementation.

Vitest and its coverage provider must resolve to the same release because
the coverage provider has an exact Vitest peer dependency. The 5.0.5
update also satisfies repoctl 6.3.0's minimum Vitest peer. Stylelint
17.16.0 and Commitlint CLI 21.2.4 satisfy its other updated tool peers.

All six published packages continue to accept PostCSS `^8`. Updating the
development installation to 8.5.32 does not justify raising consumers'
minimum PostCSS version.

VitePress 1.6.4 is still the latest stable release. Its declared Vite
dependency is `^5.4.14`, and its Vue plugin declares Vite 5/6 support.
The repository already uses a dedicated Vite 7 override because the
VitePress build is incompatible with the shared Vite 8 runtime. This
existing exception advances from 7.3.5 to 7.3.7 and requires a successful
website build. It is not an upstream-supported peer combination. The
VitePress 2.0.0-alpha.21 prerelease is not introduced.

## Override review

Overrides that remain are limited to the existing compatible major or,
for esbuild, minor line. Unrelated older consumers can resolve their own
supported versions. The VitePress override and TypeScript compatibility
pin are deliberate exceptions.

| Existing override             | Replacement                         | Reason                                                     |
| ----------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| prettier 3.9.7                | `prettier@^3: 3.9.10`               | Latest stable Prettier 3                                   |
| typescript 6.0.3              | Unchanged                           | repoctl does not support TypeScript 7                      |
| vite 8.3.0                    | `vite@^8: 8.3.5`                    | Latest stable Vite 8, without replacing other major lines  |
| vitepress@1.6.4>vite 7.3.5    | 7.3.7                               | Preserve the website's existing dedicated Vite 7 runtime   |
| postcss 8.5.28                | `postcss@^8: 8.5.32`                | Keep PostCSS 8 consumers current                           |
| postcss-selector-parser 7.1.6 | `postcss-selector-parser@^7: 7.1.7` | Latest stable parser 7                                     |
| brace-expansion 5.0.12        | `brace-expansion@^5: 5.0.12`        | Preserve older minimatch dependencies' own major lines     |
| cross-spawn 7.0.6             | `cross-spawn@^7: 7.0.6`             | Keep the existing patch within version 7                   |
| esbuild 0.28.2                | `esbuild@^0.28: 0.28.2`             | Avoid replacing incompatible pre-1.0 minor lines           |
| No tinypool override          | `tinypool@^2: 2.2.0`                | Replace oxfmt's vulnerable 2.1.0 pin within the same major |
| js-yaml 5.4.2                 | Removed                             | Existing YAML consumers declare version 3 or 4             |
| nanoid 6.0.1                  | Removed                             | PostCSS 8 declares nanoid 3                                |
| adm-zip 0.6.1                 | Removed                             | The old pnpm binary fetcher declares version 0.5           |
| uuid 14.0.2                   | Removed                             | The old pnpm server declares version 9                     |

For example, the baseline PostCSS 8.5.28 manifest requests nanoid
`^3.3.18`; minimatch 3 requests brace-expansion `^1.1.7`, while minimatch
5/9 request version 2. The former global overrides replaced those
dependencies with nanoid 6 and brace-expansion 5. Similarly,
`load-yaml-file` 0.2.0 requests js-yaml 3, several other YAML tools request
js-yaml 4, the old pnpm binary fetcher requests adm-zip `^0.5.16`, and
the old pnpm server requests uuid `^9.0.1`. These forced major changes are
removed rather than extended. Their latest package-wide dist-tags
(js-yaml 5.5.0, nanoid 6.0.2, adm-zip 0.6.1, and uuid 14.0.3) do not
override the parent packages' compatibility contracts.

The pnpm 12 lockfile uses two YAML documents: the first locks the package
manager and its platform executables; the second locks workspace
dependencies. Both documents must be preserved when regenerating the
lockfile with pnpm 12.15.0.

The obsolete `onlyBuiltDependencies` setting is removed because pnpm 12 uses
the existing `allowBuilds` policy. The explicit Lefthook denial remains in
that policy, so only the root installer configures hooks.

The initial audit found two critical Tinypool advisories
([GHSA-5gmw-xhrv-c9v3](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3)
and [GHSA-85c8-ppgw-ccpr](https://github.com/advisories/GHSA-85c8-ppgw-ccpr))
through the formatting tool's exact 2.1.0 dependency. A version-2-only override
updates this to 2.2.0 without affecting older major consumers.

KaTeX 0.16.47 remains in the Markdown lint toolchain because
`micromark-extension-math` declares `^0.16.0`. Its low-severity
[GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7)
requires a fix from the incompatible 0.18+ line. This is a development-only
dependency and is not included in the six published plugins. It is recorded
for an upstream-compatible fix rather than forced across a pre-1.0 minor line.

## repoctl workflow migration

The native hook and GitHub workflow files use the reviewed consumer assets
from `@icebreakers/monorepo-templates` 3.1.2 shipped with repoctl 6.3.0.
A scoped upgrade preview protected the existing custom hook/configuration
state, so the migration was applied explicitly instead of overwriting the
workspace's ESLint ignores, Turbo tasks, or documentation deployment.
The three Husky files, lint-staged wrapper, and obsolete tooling field are
removed together. Lefthook retains lint then typecheck before pushing.

Release keeps the `release.yml` trusted-publisher identity and uses the
plan, verify, prepare, upload, confirm, and finalize stages, recovery source
selection, an isolated OIDC audit, and failure diagnostics. Automatic
changesets retain their existing behavior while checking frozen PR heads.
Release PR exemptions require validation of the exact base/head preparation.
The optional GitHub App and existing token fallbacks are preserved. GitHub's
built-in token does not trigger follow-on pull-request workflows when it
creates commits; an App or the existing release PAT can be configured when
that behavior is required.

Documentation continues to deploy through the existing production workflow.
No new preview targets, approval environments, or scheduled publishers are
introduced.

## Validation

Local validation used macOS arm64, Node 24.22.1, and pnpm 12.15.0:

- A clean installation from the regenerated frozen lockfile passed. Both
  YAML documents parse correctly and retain all eight workspace importers;
  workspace package entries decreased from 1,603 to 1,196 after the refresh.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm tsd` passed.
  The repoctl configuration also passed a direct TypeScript check.
- All 23 test files and 405 tests passed with Vitest 5.0.5. Coverage matches
  the baseline: statements 97.79%, branches 97.95%, functions 100%, and
  lines 97.75%.
- `pnpm check:cjs` passed against packed artifacts for all six packages,
  including callable plugin exports, matching defaults, ESM behavior, and
  the presets/defaults subpaths. Packaging uses Execa's platform-aware pnpm
  resolution so Windows command shims work with argument-array execution.
  Public package manifests are unchanged.
- The website built successfully. Checks covered 27 bilingual pages/assets,
  the 404 page, and security headers. Wrangler 4.154.0 dry-run passed.
- The benchmark entry completed eight shared-utility benchmarks and parsed
  the Vitest 5 latency/throughput JSON into the existing report format.
- Actionlint 1.7.12 passed all workflows. Shell/JavaScript syntax checks,
  eight release-intent scenarios, and four automatic-intent mock scenarios
  passed. External ShellCheck/Pyflakes were not available locally.
- Nine isolated hook scenarios passed, covering real formatter fixes,
  partial staging and failure recovery, special filenames, commit messages,
  typecheck routing, pre-push ordering, protected hook paths, repeated
  installation, and linked worktrees. A real linked-worktree commit also
  passed. Controlled fixture scripts verified routing; the workspace's
  actual TypeScript checks ran separately.
- `repo release plan --json` returned an empty, unblocked plan: this tooling
  upgrade does not change public package manifests or require a release.
  No packages or production documentation were published during validation.
- `repo doctor --json` reported no failures. Its two evidence warnings concern
  override-transformed lockfile specifiers and consequently unconfirmed
  installation state; the clean frozen installation verifies this state
  using the actual declared pnpm version.
- Security auditing has no moderate, high, or critical findings; production
  dependencies have no advisories. The one low-severity development-only
  KaTeX advisory remains documented above.

CI retains Ubuntu, Windows, and macOS with Node 22.23.4/24.22.1, the Windows
Node 22 serial typecheck workaround, and adds the packed CJS check.

## Sources

- [npm registry package metadata](https://registry.npmjs.org/): every
  external direct dependency and existing override was queried individually
  using its `latest` endpoint. Existing parent versions were also queried
  to verify their dependency ranges.
- [repoctl 6.3.0 metadata](https://registry.npmjs.org/repoctl/6.3.0)
  and [implementation package metadata](https://registry.npmjs.org/@icebreakers%2fmonorepo/6.3.0).
- [TypeScript 6.0.3](https://registry.npmjs.org/typescript/6.0.3)
  and [TypeScript 7.0.2](https://registry.npmjs.org/typescript/7.0.2).
- [VitePress 1.6.4](https://registry.npmjs.org/vitepress/1.6.4),
  [Vite 7.3.7](https://registry.npmjs.org/vite/7.3.7), and
  [Vue plugin 5.2.4](https://registry.npmjs.org/@vitejs%2fplugin-vue/5.2.4).
- [Lefthook 2.2.2](https://registry.npmjs.org/lefthook/2.2.2)
  and [get-value type stub](https://registry.npmjs.org/@types%2fget-value/4.0.1).
