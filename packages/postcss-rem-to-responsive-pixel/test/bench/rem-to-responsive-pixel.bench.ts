import postcss from 'postcss'
import { describe, it } from 'vitest'
import remToPx from '../../src/index'

const sampleCss = `
.page { font-size: 1rem; margin: 0.5rem 1rem; line-height: 1.2; letter-spacing: 0.0625rem; }
.btn { padding: 0.75rem 1rem; border-radius: 0.25rem; }
.input { padding: 0.625rem; font-size: 0.875rem; }
@media (min-width: 31.25rem) {
  .card { padding: 1rem 1.5rem; margin: 2rem; }
  .modal { width: 20rem; height: 10rem; }
}
`.repeat(20)
const largerCss = sampleCss.repeat(8)

const defaultProcessor = postcss(remToPx({ propList: ['*'] }))
const mediaProcessor = postcss(remToPx({ propList: ['*'], mediaQuery: true }))
const rpxProcessor = postcss(remToPx({ propList: ['*'], transformUnit: 'rpx' }))

describe('rem-to-responsive-pixel bench', () => {
  it('rem-to-responsive-pixel benchmarks', async ({ bench }) => {
    await bench('default transform (propList=*)', { writeResult: 'benchmarks/.vitest/default-transform-prop-list.json' }, () => {
      void defaultProcessor.process(sampleCss, { from: 'bench.css' }).css
    }).run()

    await bench('media queries enabled', { writeResult: 'benchmarks/.vitest/media-queries-enabled.json' }, () => {
      void mediaProcessor.process(sampleCss, { from: 'bench.css' }).css
    }).run()

    await bench('rpx transform large stylesheet', { writeResult: 'benchmarks/.vitest/rpx-transform-large.json' }, () => {
      void rpxProcessor.process(largerCss, { from: 'bench-rpx.css' }).css
    }).run()
  })
})
