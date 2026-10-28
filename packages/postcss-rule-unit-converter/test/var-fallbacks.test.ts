import postcss from 'postcss'
import unitConverter from '../src/index'

function convert(value: string, extra = {}) {
  const root = postcss.parse('.a{width:initial}', { from: 'input.css' })
  root.walkDecls((decl) => {
    decl.value = value
  })
  return postcss(unitConverter({
    rules: [{ from: 'px', to: 'rpx', factor: 2 }],
    transformVarFallbacks: true,
    ...extra,
  })).process(root, { from: 'input.css' }).css
}

describe('可选的 var fallback 单位转换', () => {
  it('默认保留整个 var，并允许显式开启或关闭', () => {
    const source = '.a{width:var(--size48px,48px);height:48px}'
    const rules = [{ from: 'px', to: 'rpx', factor: 2 }]
    expect(postcss(unitConverter({ rules })).process(source, { from: 'input.css' }).css)
      .toBe('.a{width:var(--size48px,48px);height:96rpx}')
    expect(convert('var(--size48px,48px)')).toBe('.a{width:var(--size48px,96rpx)}')
    expect(convert('var(--size48px,48px)', { transformVarFallbacks: false }))
      .toBe('.a{width:var(--size48px,48px)}')
  })

  it('转换任意深度的 fallback，同时保留变量引用和普通函数', () => {
    expect(convert('var(--size,calc(24px + var(--other,min(12px,max(4px,2px)))))'))
      .toBe('.a{width:var(--size,calc(48rpx + var(--other,min(24rpx,max(8rpx,4rpx)))))}')
    const depth = 600
    const value = `${'var(--x,'.repeat(depth)}2px${')'.repeat(depth)}`
    expect(convert(value)).toBe(`.a{width:${'var(--x,'.repeat(depth)}4rpx${')'.repeat(depth)}}`)
  })

  it('识别大小写和转义函数名，但不改写首参数', () => {
    expect(convert(String.raw`VAR(--size48px,2px) v\61 r(--other,3px)`))
      .toBe(String.raw`.a{width:VAR(--size48px,4rpx) v\61 r(--other,6rpx)}`)
    expect(convert('var(48px,24px) var(calc(8px,4px),2px)'))
      .toBe('.a{width:var(48px,48rpx) var(calc(8px,4px),4rpx)}')
    expect(convert('var(--size) var(--size,)')).toBe('.a{width:var(--size) var(--size,)}')
  })

  it('保护字符串、注释、URL 和非 dimension token', () => {
    const value = String.raw`var(--size48px,"48px" '24px' url(12px.png) URL("8px.png") u\72l(4px.png) /* 2px */ foo48px 1pxfoo 3px)`
    expect(convert(value)).toBe(`.a{width:${value.slice(0, -4)}6rpx)}`)
  })

  it('只保留未闭合 var 原文，不执行其中的转换回调', () => {
    const transform = vi.fn(value => value * 2)
    const options = { rules: [{ from: 'px', to: 'rpx', transform }] }
    expect(convert('1px var(--x,calc(2px + var(--y,3px))', options))
      .toBe('.a{width:2rpx var(--x,calc(2px + var(--y,3px))}')
    expect(transform).toHaveBeenCalledTimes(1)
    expect(convert('var(--x,[) 2px] ) 3px')).toBe('.a{width:var(--x,[) 4rpx] ) 6rpx}')
  })

  it('对 fallback 复用完整有符号数值和科学计数 token 规则', () => {
    expect(convert('var(--x,-2px +.5px 1e2px -.005px)'))
      .toBe('.a{width:var(--x,-4rpx +1rpx 200rpx -0.01rpx)}')
    expect(convert('var(--x,2px)', { rules: [{ from: 'px', to: 'rpx', factor: 2 }, { from: 'rpx', to: 'px', factor: 3 }] }))
      .toBe('.a{width:var(--x,4rpx)}')
  })

  it('显式 unitRegex 始终完整覆盖 tokenizer 和 fallback 策略', () => {
    expect(convert('var(--x,2px) item3px', { unitRegex: /(\d+)(px)/g }))
      .toBe('.a{width:var(--x,4rpx) item6rpx}')
    expect(convert('var(--x,2px)', { unitRegex: /var\([^)]+\)|(\d+)(px)/g }))
      .toBe('.a{width:var(--x,2px)}')
  })

  it('对过滤、mediaQuery 和 replace:false 复用同一遍历', () => {
    const processor = postcss(unitConverter({
      rules: [{ from: 'px', to: 'rpx', factor: 2 }],
      transformVarFallbacks: true,
      propList: ['width'],
      selectorBlackList: ['.skip'],
      mediaQuery: true,
      replace: false,
    }))
    const source = '@media (width:var(--w,2px)){.a{width:var(--w,3px);height:var(--h,4px)}.skip{width:var(--w,5px)}}'
    const expected = '@media (width:var(--w,4rpx)){.a{width:var(--w,3px);width:var(--w,6rpx);height:var(--h,4px)}.skip{width:var(--w,5px)}}'
    expect(processor.process(source, { from: 'input.css' }).css).toBe(expected)
    expect(processor.process(source, { from: 'second.css' }).css).toBe(expected)
    expect(convert('var(--x,2px)', { rules: [{ from: 'px', to: 'px', factor: 2 }], replace: false }))
      .toBe('.a{width:var(--x,2px);width:var(--x,4px)}')
    expect(convert('var(--x,2px)', { exclude: ['input.css'] })).toBe('.a{width:var(--x,2px)}')
  })
})
