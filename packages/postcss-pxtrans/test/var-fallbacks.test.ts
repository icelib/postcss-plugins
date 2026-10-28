import type { Input } from 'postcss'
import { transform } from './utils'

describe('pxtrans 可选的 var fallback 转换', () => {
  const enabled = { transformVarFallbacks: true }

  it('默认不改变既有行为，开启后按设计稿尺寸转换 fallback', () => {
    const source = '.a{width:var(--nutui-48px,48px);height:48px}'
    expect(transform(source)).toBe('.a{width:var(--nutui-48px,48px);height:48rpx}')
    expect(transform(source, enabled)).toBe('.a{width:var(--nutui-48px,48rpx);height:48rpx}')
    expect(transform(source, { ...enabled, designWidth: 375 }))
      .toBe('.a{width:var(--nutui-48px,96rpx);height:96rpx}')
    expect(transform(source, { ...enabled, transformVarFallbacks: false })).toBe(transform(source))
  })

  it('保留原始单位大小写、rpx 平台范围、完整 token 边界和符号', () => {
    const source = '.a{margin:var(--x,-2px +.5px 1e2px 2Px 2PX 2pX 2rpx item2px 2pxfoo)}'
    expect(transform(source, { ...enabled, designWidth: 375 }))
      .toBe('.a{margin:var(--x,-4rpx +1rpx 200rpx 2Px 2PX 2pX 2rpx item2px 2pxfoo)}')
    expect(transform('.a{width:var(--x,2rpx)}', { ...enabled, platform: 'h5', rootValue: 2 }))
      .toBe('.a{width:var(--x,1rem)}')
  })

  it('保持 rootValue 回调的无符号匹配参数和真实 Input', () => {
    const rootValue = vi.fn((_input: Input, _match: string, _value: string) => 2)
    expect(transform('.a{margin:var(--x,-2px +.5px)}', { ...enabled, rootValue }))
      .toBe('.a{margin:var(--x,-1rpx +0.25rpx)}')
    expect(rootValue.mock.calls.map(call => call.slice(1))).toEqual([['2px', '2'], ['.5px', '.5']])
    expect(rootValue.mock.calls[0]?.[0]).toMatchObject({ file: expect.stringContaining('input.css') })
  })

  it('使用绝对值判断负数阈值和一像素保留，并保持舍入精度', () => {
    expect(transform('.a{margin:var(--x,-1px -2px -.5px 2px)}', { ...enabled, designWidth: 375, onePxTransform: false, minPixelValue: 2 }))
      .toBe('.a{margin:var(--x,-1px -4rpx -.5px 4rpx)}')
    expect(transform('.a{margin:var(--x,-1.005px .00001px -0px)}', { ...enabled, rootValue: 1, unitPrecision: 2 }))
      .toBe('.a{margin:var(--x,-1.01rpx 0rpx 0rpx)}')
  })

  it('复用属性、选择器、文件排除和禁用指令', () => {
    const source = '.a{width:var(--x,2px);height:var(--x,2px)}.skip{width:var(--x,2px)}'
    expect(transform(source, { ...enabled, propList: ['width'], selectorBlackList: ['.skip'] }))
      .toBe('.a{width:var(--x,2rpx);height:var(--x,2px)}.skip{width:var(--x,2px)}')
    expect(transform(source, { ...enabled, exclude: () => true })).toBe(source)
    expect(transform(`/* postcss-pxtrans disable */${source}`, enabled))
      .toBe(`/* postcss-pxtrans disable */${source}`)
  })

  it('保留 Harmony 特殊单位及黑名单语义', () => {
    expect(transform('.a{margin:var(--x,-1px -2px 2PX)}', { ...enabled, platform: 'harmony', designWidth: 375, onePxTransform: false }))
      .toBe('.a{margin:var(--x,-1ch -4px 2ch)}')
    expect(transform('.a{margin:var(--x,-2px 2PX)}', { ...enabled, platform: 'harmony', selectorBlackList: ['.a'] }))
      .toBe('.a{margin:var(--x,-2ch 2ch)}')
  })

  it('只生成一份 replace:false 结果，并保持 mediaQuery 开关', () => {
    const source = '@media (width:var(--x,2px)){.a{width:var(--x,3px)}}'
    expect(transform(source, { ...enabled, replace: false, mediaQuery: true }))
      .toBe('@media (width:var(--x,2rpx)){.a{width:var(--x,3px);width:var(--x,3rpx)}}')
    expect(transform('.a{width:var(--x,8px)}', { ...enabled, platform: 'rn', rootValue: 2, replace: false }))
      .toBe('.a{width:var(--x,8px);width:var(--x,4px)}')
    expect(transform(source, enabled))
      .toBe('@media (width:var(--x,2px)){.a{width:var(--x,3rpx)}}')
  })
})
