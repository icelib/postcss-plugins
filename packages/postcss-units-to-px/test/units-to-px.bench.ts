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
  it('units-to-px benchmarks', ({ bench }) => {
    bench('default rules medium stylesheet', () => {
      void defaultProcessor.process(mediumCss, { from: 'bench-medium.css' }).css
    })

    bench('default rules large stylesheet', () => {
      void defaultProcessor.process(largeCss, { from: 'bench-large.css' }).css
    })

    bench('propList=* with media queries', () => {
      void allPropsProcessor.process(`@media (min-width: 10rem) { ${mediumCss} }`, { from: 'bench-media.css' }).css
    })
  })
})
