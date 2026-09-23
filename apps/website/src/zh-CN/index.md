---
layout: home
title: postcss-plugins
titleTemplate: 把 CSS 单位转换变成可组合的工具
description: 面向响应式 CSS 与多端项目的 PostCSS 单位转换插件。
---

<div class="hero-kicker">POSTCSS / UNIT SYSTEMS / 2026</div>

<div class="hero-declaration" aria-label="CSS 转换示例">
  <span class="token token-selector">.card</span><span>{</span>
  <span class="token token-property">padding</span><span>:</span>
  <span class="token token-source">24px</span><span>;</span>
  <span class="token token-arrow">→</span>
  <span class="token token-result">1.5rem</span><span>;</span><span>}</span>
</div>

贴近现有 PostCSS 流程的 CSS 单位转换工具。需要稳定的旧 API 时选择专用插件，需要组合多个规则时使用统一的 rule engine。

<div class="hero-actions">
  <a class="VPButton medium brand" href="/zh-CN/guide/choose-a-plugin">选择插件</a>
  <a class="VPButton medium alt" href="/zh-CN/plugins/postcss-rule-unit-converter/">了解规则引擎</a>
</div>

## 快速选择

| 输入     | 目标                                  | 从这里开始                                                                           |
| -------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `rem`    | `px` 或 `rpx`                         | [`postcss-rem-to-responsive-pixel`](/zh-CN/plugins/postcss-rem-to-responsive-pixel/) |
| `rem`    | `vw`、`vh` 或其他 viewport 单位       | [`postcss-rem-to-viewport`](/zh-CN/plugins/postcss-rem-to-viewport/)                 |
| `px`     | 平台相关的 `rpx`、`rem`、`vw` 或 `px` | [`postcss-pxtrans`](/zh-CN/plugins/postcss-pxtrans/)                                 |
| 多种单位 | 使用自定义 unit map 转为 `px`         | [`postcss-units-to-px`](/zh-CN/plugins/postcss-units-to-px/)                         |
| 多种单位 | 组合规则和 preset                     | [`postcss-rule-unit-converter`](/zh-CN/plugins/postcss-rule-unit-converter/)         |

## 一套共享核心的工具箱

每个插件都可以独立发布，并针对 PostCSS 8 测试。匹配、精度、排除和声明处理工具集中在 [`postcss-plugin-shared`](/zh-CN/plugins/postcss-plugin-shared/) 中，让专用插件保持清晰的 API。

<div class="feature-grid">
  <div><strong>可复制示例</strong><span>安装命令和 PostCSS 配置可以直接放进项目。</span></div>
  <div><strong>输入 / 输出对照</strong><span>先看声明如何变化，再决定是否调整选项。</span></div>
  <div><strong>清晰的迁移路径</strong><span>通过并排示例从专用插件迁移到规则引擎。</span></div>
</div>
