import { expectAssignable, expectError, expectType } from 'tsd'
import type { PluginCreator } from 'postcss'
import plugin, {
  type UserDefinedOptions,
} from '../dist/index.mjs'

expectType<PluginCreator<UserDefinedOptions>>(plugin)

const options: UserDefinedOptions = {
  rootValue: 16,
  transformUnit: 'vw',
  mediaQuery: true,
}
expectAssignable<UserDefinedOptions>(options)
plugin(options)
expectError(plugin({ rootValue: '16' }))
