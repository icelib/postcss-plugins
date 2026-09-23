import postcss from 'postcss'
import { describe, it } from 'vitest'

import pxtrans, { createDirectivePlugin } from '../src/index'

function makeRules(count: number) {
  const rules: string[] = []
  for (let i = 0; i < count; i += 1) {
    rules.push(
      `.rule-${i} { font-size: ${12 + (i % 6)}px; margin: ${i % 8}px; padding: ${i % 5}px; }`,
    )
  }
  return rules.join('\n')
}

const baseCss = makeRules(400)
const directiveCss = `
/* #ifdef weapp */
${makeRules(200)}
/* #endif */
/* #ifndef weapp */
${makeRules(50)}
/* #endif */
`

const pxtransProcessor = postcss(pxtrans({ propList: ['*'] }))
const h5Processor = postcss(pxtrans({
  designWidth: 640,
  platform: 'h5',
  propList: ['*'],
  mediaQuery: true,
}))
const directiveProcessor = postcss(createDirectivePlugin({ platform: 'weapp' }))

describe('postcss-pxtrans benchmarks', () => {
  it('pxtrans benchmarks', async ({ bench }) => {
    await bench('pxtrans transform', { writeResult: 'benchmarks/.vitest/pxtrans-transform.json' }, () => {
      void pxtransProcessor.process(baseCss, { from: 'bench.css' }).css
    }).run()

    await bench('pxtrans h5 transform', { writeResult: 'benchmarks/.vitest/pxtrans-h5-transform.json' }, () => {
      void h5Processor.process(baseCss, { from: 'bench-h5.css' }).css
    }).run()

    await bench('pxtrans directives', { writeResult: 'benchmarks/.vitest/pxtrans-directives.json' }, () => {
      void directiveProcessor.process(directiveCss, { from: 'bench.css' }).css
    }).run()
  })
})
