# postcss-units-to-px design

Date: 2026-02-02
Status: accepted

## Summary

Add a new PostCSS plugin package that converts multiple CSS units to `px` using a configurable unit map, optional per-unit functions, and an optional global transform fallback.

## Goals

- Provide a default unit map for common units: `rem`, `em`, `vw`, `vh`, `vmin`, `vmax`, `rpx`.
- Allow per-unit customization via number multipliers or functions.
- Allow a global conversion function when a unit has no per-unit rule.
- Keep option shape aligned with existing plugins (propList, selectorBlackList, replace, mediaQuery, exclude, disabled, unitPrecision, minValue).
- Use shared helpers from `postcss-plugin-shared`.

## Non-goals

- Parsing value ASTs or supporting complex expression-level transforms beyond regex replacement.
- Converting absolute units by default (can be added in user config).

## Options

Default options:

```ts
const defaultOptions = {
  unitMap: {
    rem: 16,
    em: 16,
    vw: 3.75,
    vh: 6.67,
    vmin: 3.75,
    vmax: 6.67,
    rpx: 0.5,
  },
  unitPrecision: 5,
  selectorBlackList: [],
  propList: ['*'],
  replace: true,
  mediaQuery: false,
  minValue: 0,
  exclude: [/node_modules/i],
  disabled: false,
}
```

Conversion rules:

- `unitMap[unit]` as number: `px = value * number`
- `unitMap[unit]` as function: `px = fn(value, context)`
- `unitMap[unit]` as `null`: use global `transform`
- `transform(value, unit, context)` used when no per-unit rule applies

## Implementation Plan

- Scaffold `packages/postcss-units-to-px` with `pnpm exec repo package create` using the `tsdown` template.
- Implement plugin with `createUnitRegex`, `createPropListMatcher`, `createExcludeMatcher`, `declarationExists`, and `maybeBlacklistedSelector`.
- Replace values via regex, skipping strings, `url(...)`, and `var(...)`.
- Support `mediaQuery` replacement on `@media` params.
- Add README and README.zh-CN with options and usage.
- Add tests for default units, precision, propList, selector blacklist, replace=false, media query, and function-based transforms.

## Testing

- Unit tests with `vitest` using `postcss` to process input.
- Coverage for per-unit function and global transform fallback.
