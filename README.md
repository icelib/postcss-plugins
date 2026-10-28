# postcss-plugins

A PostCSS plugin monorepo focused on unit conversion and responsive styling utilities. This repo hosts multiple plugins plus shared utilities used across them.

Read the full bilingual documentation at [postcss.icebreaker.top](https://postcss.icebreaker.top/).

## Packages

- [postcss-plugin-shared](packages/postcss-plugin-shared) - Shared utilities for option merging, prop matching, regex helpers, and more.
- [postcss-rem-to-responsive-pixel](packages/postcss-rem-to-responsive-pixel) - Convert `rem` to `px` or `rpx`.
- [postcss-rem-to-viewport](packages/postcss-rem-to-viewport) - Convert `rem` to viewport units (`vw` and others).
- [postcss-pxtrans](packages/postcss-pxtrans) - Convert `px` to `rpx/rem/vw/px` with platform presets and directive comments.
- [postcss-rule-unit-converter](packages/postcss-rule-unit-converter) - Unified rule-driven unit conversion plugin with built-in common presets. See also its cookbook.
- [postcss-units-to-px](packages/postcss-units-to-px) - Convert multiple CSS units to `px` with configurable rules.

Each package has its own README with usage and configuration details.

## Requirements

- Node.js `^22.23.4 || ^24.22.1 || >=26.12.1` for workspace tooling (Node.js 24.22.1 is used for releases)
- pnpm 12.15.0 (workspace managed)

## Development

```bash
pnpm install
pnpm dev
```

Installation configures native Lefthook hooks through `repo tooling hooks install`.
Pre-commit checks staged files, commit-msg validates conventional commits, and
pre-push runs lint and typecheck. Run `pnpm repo:doctor --json` to inspect the
workspace configuration.

Documentation site commands:

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
```

Release publishing uses npm Trusted Publishing with GitHub Actions OIDC. See
[`docs/npm-trusted-publishing.md`](docs/npm-trusted-publishing.md) for the
package-level configuration.

Useful scripts:

- `pnpm build` - build all packages
- `pnpm lint` - lint all packages
- `pnpm test` - run tests with coverage

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Contributors

Thanks to [all contributors](https://github.com/icelib/postcss-plugins/graphs/contributors)!

## Authors

ice breaker <1324318532@qq.com>

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
