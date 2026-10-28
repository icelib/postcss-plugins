# npm Trusted Publishing

Releases use npm Trusted Publishing instead of a long-lived npm access token.
The release workflow requests the GitHub Actions OIDC token and repoctl 6.3.0
passes `--provenance` to `pnpm publish`. npm exchanges that token for a
short-lived publish credential for the current workflow run. The workflow
checks OIDC access and separates planning, verification, preparation, upload,
confirmation, and finalization so interrupted releases can be inspected and
recovered without changing the trusted publisher identity.

## npm package configuration

Each publishable package must have this trusted publisher in npm package
settings:

| Setting         | Value             |
| --------------- | ----------------- |
| Provider        | GitHub Actions    |
| Organization    | `icelib`          |
| Repository      | `postcss-plugins` |
| Workflow        | `release.yml`     |
| Environment     | Leave empty       |
| Allowed actions | `npm publish`     |

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

npm does not edit an existing trusted publisher in place. If a package still
has a connection for `sonofmagic/postcss-plugins`, revoke that connection and
create the `icelib/postcss-plugins` connection above. In the npm package
publishing settings, select the `npm publish` action because new connections
may default to stage-only. After the migration is verified, enable the
package option to require two-factor authentication and disallow token-based
publishing.

The repository does not contain an npm token, and the workflow must not add
`NODE_AUTH_TOKEN`, `NPM_TOKEN`, or another long-lived registry credential.
