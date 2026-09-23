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

const mediumCss = makeRules(250)
const largeCss = makeRules(2000)

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

describe('postcss-rule-unit-converter benchmark', () => {
  it('rule converter benchmarks', ({ bench }) => {
    bench('mixed rules medium stylesheet', () => {
      void processor.process(mediumCss, { from: 'bench-medium.css' }).css
    })

    bench('mixed rules large stylesheet', () => {
      void processor.process(largeCss, { from: 'bench-large.css' }).css
    })

    bench('preset group medium stylesheet', () => {
      void groupedProcessor.process(mediumCss, { from: 'bench-group.css' }).css
    })
  })
})
