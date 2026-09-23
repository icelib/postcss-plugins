---
layout: home
title: postcss-plugins
titleTemplate: CSS units, translated
description: PostCSS plugins for unit conversion, responsive styling, and multi-platform CSS.
---

<div class="hero-kicker">POSTCSS / UNIT SYSTEMS / 2026</div>

<div class="hero-declaration" aria-label="CSS conversion example">
  <span class="token token-selector">.card</span><span>{</span>
  <span class="token token-property">padding</span><span>:</span>
  <span class="token token-source">24px</span><span>;</span>
  <span class="token token-arrow">→</span>
  <span class="token token-result">1.5rem</span><span>;</span><span>}</span>
</div>

CSS unit conversion that stays close to your PostCSS pipeline. Choose a focused plugin for a familiar API, or compose rules when your design system needs more room.

<div class="hero-actions">
  <a class="vp-button brand" href="/guide/choose-a-plugin">Choose a plugin</a>
  <a class="vp-button alt" href="/plugins/postcss-rule-unit-converter/">Explore the rule engine</a>
</div>

## Find the right conversion

| You start with | You need                                  | Start here                                                                     |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| `rem`          | `px` or `rpx`                             | [`postcss-rem-to-responsive-pixel`](/plugins/postcss-rem-to-responsive-pixel/) |
| `rem`          | `vw`, `vh` or another viewport unit       | [`postcss-rem-to-viewport`](/plugins/postcss-rem-to-viewport/)                 |
| `px`           | platform-aware `rpx`, `rem`, `vw` or `px` | [`postcss-pxtrans`](/plugins/postcss-pxtrans/)                                 |
| mixed units    | `px` with a custom unit map               | [`postcss-units-to-px`](/plugins/postcss-units-to-px/)                         |
| mixed units    | composable rules and presets              | [`postcss-rule-unit-converter`](/plugins/postcss-rule-unit-converter/)         |

## A small toolkit with a shared core

Every plugin is published independently and tested against PostCSS 8. Shared matching, rounding, exclusion and declaration helpers live in [`postcss-plugin-shared`](/plugins/postcss-plugin-shared/), so the focused packages can keep their APIs small.

<div class="feature-grid">
  <div><strong>Copyable examples</strong><span>Install commands and PostCSS configs you can paste into a project.</span></div>
  <div><strong>Before / after output</strong><span>See exactly how a declaration changes before you tune options.</span></div>
  <div><strong>Migration paths</strong><span>Move from a focused package to the rule engine with side-by-side recipes.</span></div>
</div>

<style>
.hero-kicker { color: var(--vp-c-brand-1); font: 600 12px/1.4 var(--vp-font-family-mono); letter-spacing: .16em; }
.hero-declaration { margin: 28px 0; padding: 22px 26px; overflow-x: auto; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); color: var(--vp-c-text-1); font: 600 clamp(18px, 3vw, 34px)/1.4 var(--vp-font-family-mono); white-space: nowrap; }
.token-selector { color: var(--vp-c-text-2); }.token-property { color: var(--vp-c-brand-1); }.token-source { color: #ffb86c; }.token-result { color: #b8f34a; }.token-arrow { margin: 0 .45em; color: #65e6ff; }
.hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin: 26px 0 54px; }
.feature-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 24px; }
.feature-grid div { display: grid; gap: 8px; padding: 18px; border: 1px solid var(--vp-c-divider); background: var(--vp-c-bg-soft); }.feature-grid span { color: var(--vp-c-text-2); font-size: 14px; }
@media (max-width: 640px) { .feature-grid { grid-template-columns: 1fr; } .hero-declaration { margin-inline: -8px; } }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
