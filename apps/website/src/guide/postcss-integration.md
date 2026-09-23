# PostCSS integration

Install the plugin in the same workspace as PostCSS, then add it to `postcss.config.js` or `postcss.config.mjs`.

```bash
pnpm add -D postcss postcss-pxtrans
```

```js
// postcss.config.mjs
import pxtrans from 'postcss-pxtrans'

export default {
  plugins: [
    pxtrans({
      platform: 'h5',
      designWidth: 750,
    }),
  ],
}
```

PostCSS runs plugins in order. Keep unit conversion after syntax transforms that introduce declarations and before minification if you need to inspect readable output during development.

## Check the result

```css
.card {
  padding: 24px;
}
```

The generated output depends on the plugin and options. Every plugin page includes a concrete input/output example and the defaults that produced it.

## Common integration checks

- Keep `postcss` on a version supported by your build tool.
- Use `replace: false` or the package equivalent when you need fallbacks beside converted values.
- Use `propList`, `selectorBlackList` or `exclude` to protect third-party CSS.
- Add a fixture test for the exact PostCSS pipeline used by your application.
