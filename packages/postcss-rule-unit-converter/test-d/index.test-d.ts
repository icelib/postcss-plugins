import { expectError, expectType } from 'tsd'
import type { PluginCreator } from 'postcss'
import plugin, {
  composeRules,
  definePreset,
  definePresetGroup,
  presets,
  type ConversionRule,
  type PresetFactory,
  type PresetGroupFactory,
  type RemBasedPresetOptions,
  type RpxPresetGroupOptions,
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

const remFactory: PresetFactory<RemBasedPresetOptions> = definePreset<RemBasedPresetOptions>(
  (options = {}) => presets.remToPx(options),
)
expectType<ConversionRule>(remFactory({ rootValue: 20 }))
expectError(remFactory({ rootValue: '20' }))

const rpxFactory: PresetGroupFactory<RpxPresetGroupOptions> = definePresetGroup<RpxPresetGroupOptions>(
  (options = {}) => presets.rpxPresetGroup(options),
)
expectType<ConversionRule[]>(rpxFactory({ ratio: 2, viewportWidth: 375 }))
expectError(rpxFactory({ ratio: '2' }))

interface CustomPresetOptions {
  factor?: number
  unit?: string
}
const customFactory = definePreset((options: CustomPresetOptions = {}) => ({
  from: options.unit ?? 'foo',
  to: 'px',
  factor: options.factor ?? 2,
}))
expectType<PresetFactory<CustomPresetOptions>>(customFactory)
expectType<ConversionRule>(customFactory({ factor: 4 }))
const customGroup = definePresetGroup((options: CustomPresetOptions = {}) => [customFactory(options)])
expectType<PresetGroupFactory<CustomPresetOptions>>(customGroup)
expectType<ConversionRule[]>(customGroup({ unit: 'bar' }))
expectError(customFactory({ factor: '4' }))
expectError(customGroup(4))

const literalFactory = definePreset<{ factor?: number }>((options = {}) => ({ from: 'foo', to: 'px', factor: options.factor ?? 2 }))
expectType<ConversionRule>(literalFactory({ factor: 3 }))
const noOptions = definePreset(() => presets.remToPx())
expectType<PresetFactory<undefined>>(noOptions)
expectType<ConversionRule>(noOptions())
expectError(noOptions(2))
expectError(definePreset<number>(() => presets.remToPx()))
expectError(definePresetGroup<number>(() => [presets.remToPx()]))
