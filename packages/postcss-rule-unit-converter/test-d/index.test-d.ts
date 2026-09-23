import { expectError, expectType } from 'tsd'
import type { PluginCreator } from 'postcss'
import plugin, {
  composeRules,
  presets,
  type ConversionRule,
  type UserDefinedOptions,
} from '../dist/index.mjs'
import { remToPx } from '../dist/presets.mjs'

expectType<PluginCreator<UserDefinedOptions>>(plugin)
expectType<ConversionRule>(presets.remToPx({ rootValue: 16 }))
expectType<ConversionRule>(remToPx({ rootValue: 16 }))
expectType<ConversionRule[]>(composeRules(presets.remToPx(), presets.pxToRem()))
plugin({ rules: [presets.remToPx()] })
expectError(plugin({ rules: [{ from: 'rem', factor: '16' }] }))
