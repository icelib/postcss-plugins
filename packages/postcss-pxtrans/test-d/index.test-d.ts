import { expectAssignable, expectError, expectType } from 'tsd'
import pxtrans, {
  createDirectivePlugin,
  type PxTransformOptions,
} from '../dist/index.mjs'

expectType<boolean>(pxtrans.postcss)
expectType<string>(createDirectivePlugin().postcssPlugin)

const options: PxTransformOptions = {
  platform: 'h5',
  designWidth: 750,
  targetUnit: 'rem',
  propList: ['font-size'],
}
expectAssignable<PxTransformOptions>(options)
pxtrans(options)
expectError(pxtrans({ platform: 'web' }))
