# Choose a plugin

Start with the unit that appears in your source CSS and the unit your runtime expects. The focused plugins keep familiar APIs; `postcss-rule-unit-converter` is the composition layer when one stylesheet needs several conversion rules.

## Conversion map

| Source                  | Target               | Package                           | Best for                                                    |
| ----------------------- | -------------------- | --------------------------------- | ----------------------------------------------------------- |
| `rem`                   | `px` / `rpx`         | `postcss-rem-to-responsive-pixel` | Existing rem-to-pixel pipelines and Tailwind output         |
| `rem`                   | `vw` / `vh`          | `postcss-rem-to-viewport`         | Viewport-based responsive layouts                           |
| `px`                    | `rpx` / `rem` / `vw` | `postcss-pxtrans`                 | Weapp, H5, React Native, Quick App and Harmony presets      |
| Any supported unit      | `px`                 | `postcss-units-to-px`             | A small legacy API with a configurable `unitMap`            |
| Any supported unit      | Any target           | `postcss-rule-unit-converter`     | Composable rules, grouped presets and custom transforms     |
| Utility building blocks | —                    | `postcss-plugin-shared`           | Writing a plugin that shares matching and rounding behavior |

## Pick the smallest stable API

Use a focused package when its source and target match your project. Use the rule engine when you need to process `px`, `rem`, `rpx`, `vw` or `vh` in one PostCSS pass, or when the conversion policy belongs in a reusable preset.

## Next step

Read [PostCSS integration](/guide/postcss-integration), then open the plugin page for its complete options and examples.
