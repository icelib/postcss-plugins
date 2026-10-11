# 场景与迁移

## Tailwind 输出

Tailwind 输出 `rem` 时，将 `postcss-rem-to-responsive-pixel` 放在 Tailwind 的 PostCSS 插件之后，并把 root value 设置成设计系统的基准字号。如果同一份样式还需要其他单位目标，使用带 grouped preset 的 `postcss-rule-unit-converter`。

## 平台预设

`postcss-pxtrans` 提供 `weapp`、`h5`、`rn`、`quickapp`、`harmony` 预设。先选择运行时对应的预设，再按项目覆盖 `designWidth`、`rootValue` 或属性过滤条件。

## 迁移到规则引擎

专用包适合需要保持旧 API 的构建配置。当你需要组合多条规则或自定义转换时，迁移到 `postcss-rule-unit-converter`。它的迁移页提供 `postcss-rem-to-responsive-pixel`、`postcss-rem-to-viewport` 和 `postcss-units-to-px` 的选项对照。

## 保护声明

用 `propList` 控制属性，用 `selectorBlackList` 控制选择器，用 `exclude` 控制文件。`postcss-plugin-shared` 中的 matcher 规则在各个转换包之间保持一致。

## 规则引擎的匹配边界

`postcss-rule-unit-converter` 默认使用 CSS token，支持带符号数值、科学计数法和
完整解码后的单位，保护字符串、URL、标识符及整个 `var()` fallback。
显式 `unitRegex` 会替代这些保护。第一条命中规则即为最终选择，即使它返回
`undefined`；单轮不连锁转换，重复处理则可能继续转换。详见
[API 参考](/zh-CN/plugins/postcss-rule-unit-converter/api#匹配边界)。

它的 `exclude` predicate 与回调 input 指向根 CSS 入口。展开 import 后，需要
按原文件处理时，在 transform 中读取 `context.decl?.source?.input.file`；
`exclude` 不会单独跳过被导入的文件。
