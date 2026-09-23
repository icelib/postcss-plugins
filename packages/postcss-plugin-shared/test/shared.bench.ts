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
  it('shared utility benchmarks', async ({ bench }) => {
    await bench('toFixed', { writeResult: 'benchmarks/.vitest/to-fixed.json' }, () => {
      toFixed(12.3456, 3)
    }).run()

    await bench('mergeOptions', { writeResult: 'benchmarks/.vitest/merge-options.json' }, () => {
      mergeOptions(overrides, defaults)
    }).run()

    await bench('declarationExists', { writeResult: 'benchmarks/.vitest/declaration-exists.json' }, () => {
      declarationExists(decls, 'font-size', '1rem')
    }).run()

    await bench('remRegex replace', { writeResult: 'benchmarks/.vitest/rem-regex.json' }, () => {
      remRegex.lastIndex = 0
      void remValue.replace(remRegex, '$1px')
    }).run()

    await bench('pxRegex replace', { writeResult: 'benchmarks/.vitest/px-regex.json' }, () => {
      pxRegex.lastIndex = 0
      void pxValue.replace(pxRegex, '$1rem')
    }).run()

    await bench('blacklistedSelector', { writeResult: 'benchmarks/.vitest/blacklisted-selector.json' }, () => {
      blacklistedSelector(blacklist, sampleSelector)
    }).run()

    await bench('createPropListMatcher', { writeResult: 'benchmarks/.vitest/prop-list-matcher.json' }, () => {
      propMatcher('padding-left')
    }).run()

    await bench('createExcludeMatcher', { writeResult: 'benchmarks/.vitest/exclude-matcher.json' }, () => {
      excludeMatcher('/project/node_modules/pkg/index.css')
    }).run()
  })
})
