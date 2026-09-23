import type { AcceptedPlugin } from 'postcss'
import postcss from 'postcss'
import unitConverter from '../../postcss-rule-unit-converter/src/index'
import { pxRegex } from '../src/pixel-unit-regex'
import { transform } from './utils'

describe('pxRegex', () => {
  it('matches longer overlapping units before shorter units', () => {
    const regex = pxRegex(['p', 'px'])
    const output = 'a:1px;b:2p;'.replace(regex, match => match.toUpperCase())

    expect(output).toBe('a:1PX;b:2P;')
  })
})

describe('platform weapp', () => {
  it('{platform: weapp, designWidth: 750}', () => {
    const rules = 'h1 {margin: 0 0 20px;font-size: 40Px;line-height: 1.2;}'
    const expected = 'h1 {margin: 0 0 20rpx;font-size: 40Px;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'weapp', designWidth: 750 })
    expect(processed).toBe(expected)
  })

  it('{platform: weapp, designWidth: 640}', () => {
    const rules = 'h1 {margin: 0 0 20px;font-size: 40px;line-height: 1.2;}'
    const expected = 'h1 {margin: 0 0 23.4rpx;font-size: 46.8rpx;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'weapp', designWidth: 640 })
    expect(processed).toBe(expected)
  })

  it('{platform: weapp, designWidth: 375}', () => {
    const rules = 'h1 {margin: 0 0 20px;font-size: 40px;line-height: 1.2;}'
    const expected = 'h1 {margin: 0 0 40rpx;font-size: 80rpx;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'weapp', designWidth: 375 })
    expect(processed).toBe(expected)
  })
})

describe('platform weapp targetUnit variations', () => {
  it('targetUnit rem', () => {
    const rules = 'h1 {margin: 0 0 20px;font-size: 40Px;line-height: 1.2;}'
    const expected = 'h1 {margin: 0 0 0.5rem;font-size: 40Px;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'weapp', designWidth: 750, targetUnit: 'rem' })
    expect(processed).toBe(expected)
  })

  it('targetUnit px (750)', () => {
    const rules = 'h1 {margin: 0 0 20px;font-size: 40Px;line-height: 1.2;}'
    const expected = 'h1 {margin: 0 0 10px;font-size: 40Px;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'weapp', designWidth: 750, targetUnit: 'px' })
    expect(processed).toBe(expected)
  })
})

describe('platform h5', () => {
  it('{platform: h5, designWidth: 750}', () => {
    const rules = 'h1 {margin: 0 0 20px;font-size: 40px;line-height: 1.2;}'
    const expected = 'h1 {margin: 0 0 0.5rem;font-size: 1rem;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'h5', designWidth: 750 })
    expect(processed).toBe(expected)
  })

  it('{platform: h5, designWidth: 640}', () => {
    const rules = 'h1 {margin: 0 0 20px;font-size: 40Px;line-height: 1.2;}'
    const expected = 'h1 {margin: 0 0 0.585rem;font-size: 40Px;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(expected)
  })

  it('matches the equivalent rule-unit-converter output for h5 rem preset behavior', () => {
    const input = 'h1 {margin: 0 0 20px;font-size: 20rpx;line-height: 1.2;}'
    const legacy = transform(input, { platform: 'h5', designWidth: 640 })
    const unifiedPlugin = unitConverter({
      keepZeroUnit: true,
      propList: ['*'],
      unitRegex: pxRegex(['px', 'rpx']),
      rules: [
        {
          from: unit => unit === 'px' || unit === 'rpx',
          to: 'rem',
          transform(value) {
            return value / ((20 / (2.34 / 2)) * 2)
          },
        },
      ],
    }) as AcceptedPlugin
    const unified = postcss([unifiedPlugin]).process(input, { from: 'input.css' }).css

    expect(legacy).toBe(unified)
  })
})

describe('targetUnit overrides', () => {
  it('h5 targetUnit px', () => {
    const rules = 'h1 {margin: 0 0 20px;font-size: 40Px;line-height: 1.2;}'
    const expected = 'h1 {margin: 0 0 11.7px;font-size: 40Px;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'h5', designWidth: 640, targetUnit: 'px' })
    expect(processed).toBe(expected)
  })

  it('h5 targetUnit vmin', () => {
    const processed = transform('.rule{width:100px}', { platform: 'h5', designWidth: 750, targetUnit: 'vmin' })
    expect(processed).toBe('.rule{width:13.33333vmin}')
  })
})

describe('rpx & vw', () => {
  it('weapp keeps rpx', () => {
    const rules = 'h1 {margin: 0 0 20rpx;font-size: 40Px;line-height: 1.2;} .test{}'
    const processed = transform(rules, { platform: 'weapp', designWidth: 640 })
    expect(processed).toBe(rules)
  })

  it('h5 converts rpx to rem', () => {
    const rules = 'h1 {margin: 0 0 20rpx;font-size: 40Px;line-height: 1.2;} .test{}'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe('h1 {margin: 0 0 0.585rem;font-size: 40Px;line-height: 1.2;} .test{}')
  })

  it('h5 vw with designWidth 640', () => {
    const rules = 'h1 {margin: 0 0 320px;font-size: 40Px;line-height: 1.2;} .test{}'
    const processed = transform(rules, { platform: 'h5', designWidth: 640, targetUnit: 'vw' })
    expect(processed).toBe('h1 {margin: 0 0 50vw;font-size: 40Px;line-height: 1.2;} .test{}')
  })
})

describe('platform rn/harmony/quickapp', () => {
  it('rn scales px', () => {
    const rules = 'view { width: 100px; }'
    const options = {
      platform: 'rn',
      designWidth: 750,
      deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
    } as const
    const processed = transform(rules, options)
    expect(processed).toBe('view { width: 50px; }')
  })

  it('harmony converts uppercase PX to ch', () => {
    const rules = 'view { width: 100PX; }'
    const options = {
      platform: 'harmony',
      designWidth: 640,
      deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
    } as const
    const processed = transform(rules, options)
    expect(processed).toBe('view { width: 100ch; }')
  })

  it('quickapp uses px unchanged', () => {
    const processed = transform('.rule{width:100px}', { platform: 'quickapp', designWidth: 750 })
    expect(processed).toBe('.rule{width:100px}')
  })
})
