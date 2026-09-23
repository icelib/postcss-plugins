import postcss from 'postcss'
import { describe, it } from 'vitest'

import unitsToPx from '../src/index'

function makeRules(count: number) {
  const rules: string[] = []
  const units = ['rem', 'em', 'vw', 'vh', 'rpx'] as const

  for (let i = 0; i < count; i += 1) {
    const unit = units[i % units.length]
    const nextUnit = units[(i + 1) % units.length]
    rules.push(
      `.rule-${i}{font-size:${1 + (i % 4) * 0.25}${unit};margin:${0.5 + (i % 3) * 0.5}${nextUnit};padding:${1 + (i % 2) * 0.5}${unit};}`,
    )
  }

  return rules.join('\n')
}

const mediumCss = makeRules(300)
const largeCss = makeRules(2400)

const defaultProcessor = postcss(unitsToPx())
const allPropsProcessor = postcss(unitsToPx({
  mediaQuery: true,
  propList: ['*'],
}))

describe('postcss-units-to-px benchmark', () => {
  it('units-to-px benchmarks', async ({ bench }) => {
    await bench('default rules medium stylesheet', { writeResult: 'benchmarks/.vitest/default-rules-medium.json' }, () => {
      void defaultProcessor.process(mediumCss, { from: 'bench-medium.css' }).css
    }).run()

    await bench('default rules large stylesheet', { writeResult: 'benchmarks/.vitest/default-rules-large.json' }, () => {
      void defaultProcessor.process(largeCss, { from: 'bench-large.css' }).css
    }).run()

    await bench('propList=* with media queries', { writeResult: 'benchmarks/.vitest/prop-list-with-media-queries.json' }, () => {
      void allPropsProcessor.process(`@media (min-width: 10rem) { ${mediumCss} }`, { from: 'bench-media.css' }).css
    }).run()
  })
})
