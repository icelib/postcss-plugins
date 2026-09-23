import { expectAssignable, expectError, expectType } from 'tsd'
import type { PluginCreator } from 'postcss'
import plugin, {
  type UserDefinedOptions,
} from '../dist/index.mjs'

expectType<PluginCreator<UserDefinedOptions>>(plugin)

const options: UserDefinedOptions = {
  rootValue: input => input.file?.includes('tablet') ? 18 : 16,
  transformUnit: 'rpx',
  processorStage: 'OnceExit',
}
expectAssignable<UserDefinedOptions>(options)
plugin(options)
expectError(plugin({ transformUnit: 'vw' }))
