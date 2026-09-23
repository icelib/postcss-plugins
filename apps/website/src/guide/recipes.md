# Recipes and migrations

## Tailwind output

When Tailwind emits `rem`, place `postcss-rem-to-responsive-pixel` after Tailwind's PostCSS plugin and set the root value to the design system's base font size. If the same stylesheet needs several unit targets, use `postcss-rule-unit-converter` with a grouped preset.

## Platform presets

`postcss-pxtrans` provides `weapp`, `h5`, `rn`, `quickapp` and `harmony` presets. Start from the preset that matches the runtime, then override `designWidth`, `rootValue`, or property filters for the project.

## Migrating to the rule engine

The focused packages remain useful when their old API is part of your public build configuration. Move to `postcss-rule-unit-converter` when you need multiple rules or custom transforms. Its migration page contains side-by-side option mapping for `postcss-rem-to-responsive-pixel`, `postcss-rem-to-viewport`, and `postcss-units-to-px`.

## Protecting declarations

Use `propList` for property-level control, `selectorBlackList` for selectors, and `exclude` for file-level decisions. The shared matcher behavior is documented in `postcss-plugin-shared` and is consistent across the conversion packages.
