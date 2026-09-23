import { expectType } from 'tsd'
import {
  createPropListMatcher,
  createUnitRegex,
  toFixed,
} from '../dist/index.mjs'

expectType<number>(toFixed(1.25, 2))
expectType<RegExp>(createUnitRegex({ units: ['rem', 'px'] }))
expectType<boolean>(createPropListMatcher(['*'])('font-size'))
