import postcss from 'postcss'
import { describe, it } from 'vitest'

import unitConverter, { composeRules, presets } from '../src/index'

function makeRules(count: number) {
  const rules: string[] = []
  for (let i = 0; i < count; i += 1) {
    rules.push(
      `.rule-${i}{font-size:${12 + (i % 6)}px;margin:${0.5 + (i % 4) * 0.25}rem;width:${10 + (i % 20)}vw;height:${5 + (i % 10)}vh;}`,
    )
  }
  return rules.join('\n')
}

function makeSingleRuleDeclarations(count: number, duplicate = false) {
  const declarations = Array.from({ length: count }, (_, index) => {
    const property = duplicate ? 'margin' : `--bench-value-${index}`
    return `${property}:${(index % 16) + 1}rem;`
  }).join('')
  return `.benchmark{${declarations}}`
}

const mediumCss = makeRules(250)
const largeCss = makeRules(2000)
const twoThousandDeclarationsCss = makeSingleRuleDeclarations(2000)
const fourThousandDeclarationsCss = makeSingleRuleDeclarations(4000)
const duplicateDeclarationsCss = makeSingleRuleDeclarations(2000, true)
const mediaQueryCss = `@media (min-width: 20rem) { ${largeCss} }`
const selectorBlacklistCss = `.ignored{margin:1rem;padding:2rem}\n.active{margin:1rem;padding:2rem}`

const processor = postcss(unitConverter({
  propList: ['*'],
  rules: composeRules(
    presets.pxToRem({ rootValue: 16 }),
    presets.remToRpx({ rootValue: 16 }),
    presets.vwToPx({ viewportWidth: 375 }),
    presets.vhToPx({ viewportHeight: 667 }),
  ),
}))

const groupedProcessor = postcss(unitConverter({
  propList: ['*'],
  rules: presets.webPresetGroup({
    rootValue: 16,
    viewportWidth: 375,
    viewportHeight: 667,
  }),
}))

const blacklistProcessor = postcss(unitConverter({
  propList: ['*'],
  selectorBlackList: ['.ignored'],
  rules: [presets.remToPx({ rootValue: 16 })],
}))

const replaceFalseProcessor = postcss(unitConverter({
  propList: ['*'],
  replace: false,
  rules: [presets.remToPx({ rootValue: 16 })],
}))

describe('postcss-rule-unit-converter benchmark', () => {
  it('rule converter benchmarks', async ({ bench }) => {
    await bench('mixed rules medium stylesheet', { writeResult: 'benchmarks/.vitest/mixed-rules-medium-stylesheet.json' }, () => {
      void processor.process(mediumCss, { from: 'bench-medium.css' }).css
    }).run()

    await bench('mixed rules large stylesheet', { writeResult: 'benchmarks/.vitest/mixed-rules-large-stylesheet.json' }, () => {
      void processor.process(largeCss, { from: 'bench-large.css' }).css
    }).run()

    await bench('preset group medium stylesheet', { writeResult: 'benchmarks/.vitest/preset-group-medium-stylesheet.json' }, () => {
      void groupedProcessor.process(mediumCss, { from: 'bench-group.css' }).css
    }).run()

    await bench('single rule 2k declarations', { writeResult: 'benchmarks/.vitest/single-rule-2k-declarations.json' }, () => {
      void processor.process(twoThousandDeclarationsCss, { from: 'bench-2k.css' }).css
    }).run()

    await bench('single rule 4k declarations', { writeResult: 'benchmarks/.vitest/single-rule-4k-declarations.json' }, () => {
      void processor.process(fourThousandDeclarationsCss, { from: 'bench-4k.css' }).css
    }).run()

    await bench('duplicate declarations', { writeResult: 'benchmarks/.vitest/duplicate-declarations.json' }, () => {
      void processor.process(duplicateDeclarationsCss, { from: 'bench-duplicate.css' }).css
    }).run()

    await bench('media query traversal', { writeResult: 'benchmarks/.vitest/media-query-traversal.json' }, () => {
      void processor.process(mediaQueryCss, { from: 'bench-media.css' }).css
    }).run()

    await bench('selector blacklist', { writeResult: 'benchmarks/.vitest/selector-blacklist.json' }, () => {
      void blacklistProcessor.process(selectorBlacklistCss, { from: 'bench-blacklist.css' }).css
    }).run()

    await bench('replace false', { writeResult: 'benchmarks/.vitest/replace-false.json' }, () => {
      void replaceFalseProcessor.process(largeCss, { from: 'bench-replace-false.css' }).css
    }).run()
  })
})
