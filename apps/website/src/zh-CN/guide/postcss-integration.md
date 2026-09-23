# 接入 PostCSS

在 PostCSS 所在的 workspace 中安装插件，再加入 `postcss.config.js` 或 `postcss.config.mjs`。

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

PostCSS 会按顺序运行插件。需要检查可读输出时，将单位转换放在会生成声明的语法转换之后、压缩之前。

## 检查结果

```css
.card {
  padding: 24px;
}
```

最终输出取决于插件和选项。每个插件页面都提供具体的输入 / 输出示例以及产生该结果的默认值。

## 常见接入检查

- 确认 `postcss` 版本与构建工具兼容。
- 需要 fallback 时使用 `replace: false` 或对应插件的等价选项。
- 用 `propList`、`selectorBlackList` 或 `exclude` 保护第三方 CSS。
- 为项目实际使用的 PostCSS 流程增加 fixture 测试。
