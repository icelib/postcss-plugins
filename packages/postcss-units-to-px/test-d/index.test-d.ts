import { expectError, expectType } from 'tsd'
import type { PluginCreator } from 'postcss'
import plugin, {
  type UnitMap,
  type UserDefinedOptions,
} from '../dist/index.mjs'
import { defaultUnitMap } from '../dist/defaults.mjs'

expectType<PluginCreator<UserDefinedOptions>>(plugin)
expectType<UnitMap>(defaultUnitMap)

const options: UserDefinedOptions = {
  unitMap: new Map([['rem', 16]]),
  transform: (value, unit) => unit === 'em' ? value * 12 : value * 16,
}
plugin(options)
expectError(plugin({ unitMap: { rem: '16' } }))
