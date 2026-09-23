import type { PxTransformOptions } from '../src/types'
import postcss from 'postcss'
import { createAdvancedPropListMatcher } from 'postcss-plugin-shared'
import pxTransform from '../src/index'
import { basicCSS, transform } from './utils'

describe('pxTransform basics', () => {
  it('should work on the readme example', () => {
    const input = 'h1 { margin: 0 0 20px; font-size: 32px; line-height: 1.2; letter-spacing: 1px; }'
    const output = 'h1 { margin: 0 0 0.585rem; font-size: 0.936rem; line-height: 1.2; letter-spacing: 0.02925rem; }'
    const processed = transform(input, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(output)
  })

  it('should replace the px unit with rem', () => {
    const processed = transform(basicCSS, { platform: 'h5', designWidth: 640 })
    const expected = '.rule { font-size: 0.43875rem }'
    expect(processed).toBe(expected)
  })

  it('should ignore non px properties', () => {
    const expected = '.rule { font-size: 2em }'
    const processed = transform(expected, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(expected)
  })

  it('should handle < 1 values and values without a leading 0', () => {
    const rules = '.rule { margin: 0.5rem .5px -0.2px -.2em }'
    const expected = '.rule { margin: 0.5rem 0.01463rem -0.00585rem -.2em }'
    const processed = transform(rules, { platform: 'h5', designWidth: 640, propList: ['margin'] })
    expect(processed).toBe(expected)
  })

  it('should not add properties that already exist', () => {
    const expected = '.rule { font-size: 40px; font-size: 1rem; }'
    const processed = transform(expected, { platform: 'h5', designWidth: 750 })
    expect(processed).toBe(expected)
  })

  it('should transform 0px but keep 0 unchanged', () => {
    const rule = '.rule { font-size: 0px; font-size: 0; }'
    const expected = '.rule { font-size: 0rpx; font-size: 0; }'
    const processed = transform(rule)
    expect(processed).toBe(expected)
  })

  it('should work on custom baseFontSize', () => {
    const processed = transform(basicCSS, { platform: 'h5', baseFontSize: 15 })
    const expected = '.rule { font-size: 0.5rem }'
    expect(processed).toBe(expected)
  })
})

describe('value parsing', () => {
  it('should not replace values in quotes (default propList)', () => {
    const rules = '.rule { content: \'16px\'; font-family: "16px"; font-size: 16px; }'
    const expected = '.rule { content: \'16px\'; font-family: "16px"; font-size: 0.468rem; }'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(expected)
  })

  it('should not replace values in quotes (propList all)', () => {
    const options = { platform: 'h5', designWidth: 640, propList: ['*'] } as const
    const rules = '.rule { content: \'16px\'; font-family: "16px"; font-size: 16px; }'
    const expected = '.rule { content: \'16px\'; font-family: "16px"; font-size: 0.468rem; }'
    const processed = transform(rules, options)
    expect(processed).toBe(expected)
  })

  it('should not replace values in url() (default propList)', () => {
    const rules = '.rule { background: url(16px.jpg); font-size: 16px; }'
    const expected = '.rule { background: url(16px.jpg); font-size: 0.468rem; }'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(expected)
  })

  it('should not replace values in url() (propList all)', () => {
    const options = { platform: 'h5', designWidth: 640, propList: ['*'] } as const
    const rules = '.rule { background: url(16px.jpg); font-size: 16px; }'
    const expected = '.rule { background: url(16px.jpg); font-size: 0.468rem; }'
    const processed = transform(rules, options)
    expect(processed).toBe(expected)
  })

  it('should not replace values in var() fallbacks', () => {
    const options = { platform: 'h5', designWidth: 640, propList: ['*'] } as const
    const rules = '.rule { margin: var(--gap, calc(16px + 8px)); font-size: 16px; }'
    const expected = '.rule { margin: var(--gap, calc(16px + 8px)); font-size: 0.468rem; }'
    const processed = transform(rules, options)
    expect(processed).toBe(expected)
  })

  it('should not replace values with an uppercase P or X', () => {
    const options = { platform: 'h5', designWidth: 640, propList: ['*'] } as const
    const rules = '.rule { margin: 12px calc(100% - 14PX); height: calc(100% - 20px); font-size: 12Px; line-height: 16px; }'
    const expected = '.rule { margin: 0.351rem calc(100% - 14PX); height: calc(100% - 0.585rem); font-size: 12Px; line-height: 0.468rem; }'
    const processed = transform(rules, options)
    expect(processed).toBe(expected)
  })
})

describe('precision & ranges', () => {
  it('should replace using a decimal of 2 places', () => {
    const expected = '.rule { font-size: 0.44rem }'
    const options = { platform: 'h5', designWidth: 640, unitPrecision: 2 } as const
    const processed = transform(basicCSS, options)
    expect(processed).toBe(expected)
  })

  it('should not replace values below minPixelValue', () => {
    const options: PxTransformOptions = { platform: 'h5', designWidth: 640, minPixelValue: 2 }
    const rules = '.rule { border: 1px solid #000; font-size: 16px; margin: 1px 10px; }'
    const expected = '.rule { border: 1px solid #000; font-size: 0.468rem; margin: 1px 0.2925rem; }'
    const processed = transform(rules, options)
    expect(processed).toBe(expected)
  })
})

describe('propList', () => {
  it('should respect notEndWith in propList', () => {
    const processed = transform('.rule{dummy:16px;width:16px}', {
      platform: 'h5',
      designWidth: 750,
      propList: ['*', '!*y'],
    })
    expect(processed).toBe('.rule{dummy:16px;width:0.4rem}')
  })

  it('should only replace properties in the prop list', () => {
    const css = '.rule { font-size: 16px; margin: 16px; margin-left: 5px; padding: 5px; padding-right: 16px }'
    const expected = '.rule { font-size: 0.468rem; margin: 0.468rem; margin-left: 5px; padding: 5px; padding-right: 0.468rem }'
    const options = { platform: 'h5', designWidth: 640, propList: ['*font*', 'margin*', '!margin-left', '*-right', 'pad'] } as const
    const processed = transform(css, options)
    expect(processed).toBe(expected)
  })

  it('should only replace properties in the prop list with wildcard', () => {
    const css = '.rule { font-size: 16px; margin: 16px; margin-left: 5px; padding: 5px; padding-right: 16px }'
    const expected = '.rule { font-size: 16px; margin: 0.468rem; margin-left: 5px; padding: 5px; padding-right: 16px }'
    const options = { platform: 'h5', designWidth: 640, propList: ['*', '!margin-left', '!*padding*', '!font*'] } as const
    const processed = transform(css, options)
    expect(processed).toBe(expected)
  })

  it('should support arbitrary-position glob exclusions', () => {
    const css = '.rule { width: 16px; --wot-color: 16px; --wot-fs-title: 16px; --wot-body-font-size: 16px; --other-font-size: 16px }'
    const expected = '.rule { width: 0.468rem; --wot-color: 16px; --wot-fs-title: 16px; --wot-body-font-size: 16px; --other-font-size: 0.468rem }'
    const options = {
      platform: 'h5',
      designWidth: 640,
      propList: ['*', '!--wot-*', '!--wot-fs-*', '!--wot-*-font-size'],
    } as const
    const processed = transform(css, options)
    expect(processed).toBe(expected)
  })
})

describe('selectorBlackList & replace/media', () => {
  it('should ignore selectors in blacklist', () => {
    const rules = '.rule { font-size: 15px } .rule2 { font-size: 15px }'
    const expected = '.rule { font-size: 0.43875rem } .rule2 { font-size: 15px }'
    const options = { platform: 'h5', designWidth: 640, selectorBlackList: ['.rule2'] } as const
    const processed = transform(rules, options)
    expect(processed).toBe(expected)
  })

  it('should only ignore exactly body', () => {
    const rules = 'body { font-size: 16px; } .class-body { font-size: 16px; } .simple-class { font-size: 16px; }'
    const expected = 'body { font-size: 16px; } .class-body { font-size: 0.468rem; } .simple-class { font-size: 0.468rem; }'
    const options = { platform: 'h5', designWidth: 640, selectorBlackList: [/^body$/] } as const
    const processed = transform(rules, options)
    expect(processed).toBe(expected)
  })

  it('should leave fallback pixel unit with root em value', () => {
    const options = { platform: 'h5', designWidth: 640, replace: false } as const
    const processed = transform(basicCSS, options)
    const expected = '.rule { font-size: 15px; font-size: 0.43875rem }'
    expect(processed).toBe(expected)
  })

  it('should replace px in media queries', () => {
    const options = { platform: 'h5', designWidth: 640, mediaQuery: true } as const
    const processed = transform('@media (min-width: 500px) { .rule { font-size: 16px } }', options)
    const expected = '@media (min-width: 14.625rem) { .rule { font-size: 0.468rem } }'
    expect(processed).toBe(expected)
  })
})

describe('propList advanced matcher', () => {
  it('supports exact/start/end/contain and negations', () => {
    const match = createAdvancedPropListMatcher([
      '*',
      '*margin*',
      'border*',
      '!*font*',
      '*height',
      '!padding',
    ])

    expect(match('margin-left')).toBe(true)
    expect(match('border-left')).toBe(true)
    expect(match('line-height')).toBe(true)
    expect(match('padding')).toBe(false)
    expect(match('font-family')).toBe(false)
  })
})

describe('additional coverage', () => {
  it('should process declarations consistently across multiple runs', () => {
    const plugin = pxTransform({ platform: 'h5', designWidth: 750 })
    const first = postcss([plugin]).process('.rule{width:10px}', { from: 'a.css' }).css
    const second = postcss([plugin]).process('.rule{width:10px}', { from: 'a.css' }).css

    expect(first).toBe('.rule{width:0.25rem}')
    expect(second).toBe('.rule{width:0.25rem}')
  })

  it('should ignore non-decl nodes in declarationExists', () => {
    const css = '.rule{/*c*/font-size:16px;font-size:0.468rem;}'
    const processed = transform(css, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(css)
  })
})
