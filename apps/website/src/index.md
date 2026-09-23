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
  <a class="VPButton medium brand" href="/guide/choose-a-plugin">Choose a plugin</a>
  <a class="VPButton medium alt" href="/plugins/postcss-rule-unit-converter/">Explore the rule engine</a>
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
