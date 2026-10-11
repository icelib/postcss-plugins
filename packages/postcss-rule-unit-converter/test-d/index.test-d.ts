import { expectError, expectType } from 'tsd'
import type { PluginCreator } from 'postcss'
import plugin, {
  composeRules,
  presets,
  type ConversionRule,
  type RuleContext,
  type UnitTransform,
  type UserDefinedOptions,
} from '../dist/index.mjs'
import { remToPx } from '../dist/presets.mjs'

expectType<PluginCreator<UserDefinedOptions>>(plugin)
expectType<ConversionRule>(presets.remToPx({ rootValue: 16 }))
expectType<ConversionRule>(remToPx({ rootValue: 16 }))
expectType<ConversionRule[]>(composeRules(presets.remToPx(), presets.pxToRem()))
plugin({ rules: [presets.remToPx()] })
expectError(plugin({ rules: [{ from: 'rem', factor: '16' }] }))

const signedTransform: UnitTransform = (value, context) => {
  expectType<number>(value)
  expectType<RuleContext>(context)
  expectType<string>(context.fromUnit)
  expectType<string>(context.rawUnit)
  expectType<string>(context.rawValue)
  expectType<string | undefined>(context.filePath)
  return { value: -value, unit: 'rpx' }
}
plugin({
  rules: [{ from: unit => unit === 'rem', transform: signedTransform, minValue: 1 }],
  unitRegex: /([+-]?\d+)(rem)/g,
  mediaQuery: true,
  exclude: path => path.includes('vendor'),
})
