# 选择插件

先看源 CSS 中出现的单位，再看运行时需要的目标单位。专用插件保留熟悉的 API；当一份样式需要多套转换规则时，使用 `postcss-rule-unit-converter`。

## 转换矩阵

| 输入       | 目标                 | 包                                | 适合场景                                    |
| ---------- | -------------------- | --------------------------------- | ------------------------------------------- |
| `rem`      | `px` / `rpx`         | `postcss-rem-to-responsive-pixel` | 已有 rem-to-pixel 流程和 Tailwind 输出      |
| `rem`      | `vw` / `vh`          | `postcss-rem-to-viewport`         | 基于 viewport 的响应式布局                  |
| `px`       | `rpx` / `rem` / `vw` | `postcss-pxtrans`                 | weapp、H5、React Native、Quick App、Harmony |
| 支持的单位 | `px`                 | `postcss-units-to-px`             | 需要可配置 `unitMap` 的简洁旧 API           |
| 支持的单位 | 任意目标             | `postcss-rule-unit-converter`     | 可组合规则、分组 preset、自定义转换         |
| 工具函数   | —                    | `postcss-plugin-shared`           | 编写需要统一匹配和精度逻辑的插件            |

## 选择最小且稳定的 API

源单位和目标单位已经明确时，优先使用专用包。需要在一次 PostCSS 处理中混合 `px`、`rem`、`rpx`、`vw`、`vh`，或者需要复用转换策略时，再使用规则引擎。

## 下一步

先阅读[接入 PostCSS](/zh-CN/guide/postcss-integration)，再打开具体插件页面查看完整选项和示例。
