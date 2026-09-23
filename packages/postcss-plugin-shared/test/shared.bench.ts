import postcss from 'postcss'
import { describe, it } from 'vitest'
import {
  blacklistedSelector,
  createExcludeMatcher,
  createPropListMatcher,
  declarationExists,
  mergeOptions,
  pxRegex,
  remRegex,
  toFixed,
} from '../src/index'

const root = postcss.parse('.rule { font-size: 1rem; margin: 12px; padding: 8px; }')
const firstNode = root.nodes?.[0]
const decls = firstNode && 'nodes' in firstNode && Array.isArray(firstNode.nodes)
  ? firstNode.nodes
  : []

const propMatcher = createPropListMatcher(['font-size', /padding/])
const excludeMatcher = createExcludeMatcher(['node_modules', /dist/])
const blacklist = ['.ignore', /primary/]
const sampleSelector = '.btn-primary'

const remValue = 'calc(1rem + 0.5rem) url(image.png)'
const pxValue = 'margin: 12px; padding: 8px;'

const defaults = {
  unitPrecision: 5,
  propList: ['*'],
  mediaQuery: false,
  selectorBlackList: ['.ignore'],
}
const overrides = {
  unitPrecision: 6,
  propList: ['font-size', 'margin'],
}

describe('postcss-plugin-shared benchmarks', () => {
  it('shared utility benchmarks', ({ bench }) => {
    bench('toFixed', () => {
      toFixed(12.3456, 3)
    })

    bench('mergeOptions', () => {
      mergeOptions(overrides, defaults)
    })

    bench('declarationExists', () => {
      declarationExists(decls, 'font-size', '1rem')
    })

    bench('remRegex replace', () => {
      remRegex.lastIndex = 0
      void remValue.replace(remRegex, '$1px')
    })

    bench('pxRegex replace', () => {
      pxRegex.lastIndex = 0
      void pxValue.replace(pxRegex, '$1rem')
    })

    bench('blacklistedSelector', () => {
      blacklistedSelector(blacklist, sampleSelector)
    })

    bench('createPropListMatcher', () => {
      propMatcher('padding-left')
    })

    bench('createExcludeMatcher', () => {
      excludeMatcher('/project/node_modules/pkg/index.css')
    })
  })
})
