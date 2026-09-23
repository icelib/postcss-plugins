import { transform } from './utils'

describe('directives plugin', () => {
  it('should not transform when disable comment exists', () => {
    const rules = '/*postcss-pxtrans disable*/ h1 {margin: 0 0 20px;font-size: 40Px;line-height: 1.2;}'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(rules)
  })

  it('should keep for specified platform (#ifdef)', () => {
    const rules = '/*  #ifdef  h5  */ h1 {margin: 0 0 20Px;font-size: 40Px;line-height: 1.2;}/*  #endif  */'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(rules)
  })

  it('should remove non-specified platform section (#ifdef)', () => {
    const rules = '/*  #ifdef  rn  */ h1 {margin: 0 0 20px;font-size: 40Px;line-height: 1.2;}/*  #endif  */ .test{}'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe('/*  #ifdef  rn  *//*  #endif  */ .test{}')
  })

  it('should support tabs and nested conditional blocks', () => {
    const rules = '/*\t#ifdef\t rn\t*/ .outer{} /* #ifdef android */ .inner{} /* #endif */ .after{} /* #endif */ .keep{}'
    const processed = transform(rules, { platform: 'h5' })
    expect(processed).toBe('/*\t#ifdef\t rn\t*/ /* #endif */ .keep{}')
  })

  it('should handle #ifndef remove', () => {
    const rules = '/*  #ifndef  h5  */ h1 {margin: 0 0 20px;font-size: 40Px;line-height: 1.2;}/*  #endif  */ .test{}'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe('/*  #ifndef  h5  *//*  #endif  */ .test{}')
  })

  it('should keep when #ifndef does not match platform', () => {
    const rules = '/*  #ifndef  rn  */ h1 {margin: 0 0 20Px;font-size: 40Px;line-height: 1.2;}/*  #endif  */ .test{}'
    const processed = transform(rules, { platform: 'h5', designWidth: 640 })
    expect(processed).toBe(rules)
  })

  it('rn eject should remove nodes between markers', () => {
    const css = '/*postcss-pxtrans rn eject enable*/.a{width:10px;}/*postcss-pxtrans rn eject disable*/.b{width:10px;}'
    const processed = transform(css, { platform: 'rn', designWidth: 750 })
    expect(processed).not.toContain('.a{width:5px}')
    expect(processed).toContain('.b{width:5px;}')
  })

  it('should no-op media params when file disabled', () => {
    const css = '/*postcss-pxtrans disable*/@media (min-width: 500px) { .rule { font-size: 1em } }'
    const processed = transform(css, { platform: 'h5', designWidth: 640, mediaQuery: true })
    expect(processed).toBe(css)
  })

  it('should ignore platform directives when methods exclude platform', () => {
    const rules = '/*  #ifdef  rn  */ h1 {margin: 0 0 20Px;font-size: 40Px;line-height: 1.2;}/*  #endif  */'
    const processed = transform(rules, { platform: 'h5', designWidth: 640, methods: ['size'] })
    expect(processed).toContain('20Px')
  })
})
