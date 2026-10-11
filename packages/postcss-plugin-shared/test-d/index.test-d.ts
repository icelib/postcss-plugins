import { expectType } from 'tsd'
import postcss from 'postcss'
import {
  createPropListMatcher,
  createUnitRegex,
  declarationExists,
  toFixed,
  walkAndReplaceValues,
} from '../dist/index.mjs'

expectType<number>(toFixed(1.25, 2))
expectType<RegExp>(createUnitRegex({ units: ['rem', 'px'] }))
expectType<boolean>(createPropListMatcher(['*'])('font-size'))

const root = postcss.parse('.rule{width:1rem}')
expectType<void>(walkAndReplaceValues({
  root,
  propList: ['*'],
  unitRegex: /(\d+)rem/g,
  createReplacer: context => (match, value) => {
    expectType<string | undefined>(context.filePath)
    expectType<string>(match)
    expectType<string | undefined>(value)
    return '16px'
  },
}))
expectType<void>(walkAndReplaceValues({
  root,
  propList: ['*'],
  createValueTransformer: context => (value) => {
    expectType<postcss.Declaration | undefined>(context.decl)
    expectType<string>(value)
    return value
  },
}))
expectType<boolean>(declarationExists([], 'width', '16px'))
expectType<boolean>(declarationExists([], 'width', '16px', true))
