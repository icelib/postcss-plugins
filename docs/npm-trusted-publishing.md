# npm Trusted Publishing

Releases use npm Trusted Publishing instead of a long-lived npm access token.
The release workflow requests the GitHub Actions OIDC token and repoctl 5.5.4
passes `--provenance` to `pnpm publish`. npm exchanges that token for a
short-lived publish credential for the current workflow run.

## npm package configuration

Each publishable package must have this trusted publisher in npm package
settings:

| Setting      | Value             |
| ------------ | ----------------- |
| Provider     | GitHub Actions    |
| Organization | `icelib`          |
| Repository   | `postcss-plugins` |
| Workflow     | `release.yml`     |
| Environment  | Leave empty       |
| Permission   | Publish           |

Packages:

- `postcss-plugin-shared`
- `postcss-rem-to-responsive-pixel`
- `postcss-rem-to-viewport`
- `postcss-pxtrans`
- `postcss-rule-unit-converter`
- `postcss-units-to-px`

With npm 11.5 or newer, the same relationship can be created from a
maintainer machine (the first request may require browser-based 2FA):

```sh
npm trust github <package> \
  --file release.yml \
  --repo icelib/postcss-plugins \
  --allow-publish
```

The repository does not contain an npm token, and the workflow must not add
`NODE_AUTH_TOKEN`, `NPM_TOKEN`, or another long-lived registry credential.
