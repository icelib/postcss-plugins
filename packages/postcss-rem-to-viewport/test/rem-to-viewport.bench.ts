import postcss from 'postcss'
import { describe, it } from 'vitest'

import remToVw from '../src/index'

const processor = postcss(remToVw())
const mediaProcessor = postcss(remToVw({
  mediaQuery: true,
  propList: ['*'],
}))

function makeRules(count: number) {
  const rules: string[] = []
  for (let i = 0; i < count; i += 1) {
    rules.push(
      `.rule-${i} { font-size: 1rem; margin: ${i % 4}rem; padding: ${i % 3}rem; letter-spacing: 0.0625rem; }`,
    )
  }
  return rules.join('\n')
}

const smallCSS = makeRules(10)
const mediumCSS = makeRules(200)
const largeCSS = makeRules(2000)

describe('postcss-rem-to-viewport benchmark', () => {
  it('rem-to-viewport benchmarks', ({ bench }) => {
    bench('small stylesheet', async () => {
      await processor.process(smallCSS, { from: 'small.css' })
    })

    bench('medium stylesheet', async () => {
      await processor.process(mediumCSS, { from: 'medium.css' })
    })

    bench('large stylesheet', async () => {
      await processor.process(largeCSS, { from: 'large.css' })
    })

    bench('medium stylesheet with media queries', async () => {
      await mediaProcessor.process(`@media (min-width: 20rem) { ${mediumCSS} }`, { from: 'media.css' })
    })
  })
})
