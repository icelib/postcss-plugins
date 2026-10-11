import postcss from 'postcss'
import pxtrans from '../src/index'

it('forwards native PostCSS context through guarded pxtrans delegation for source-less AST input', () => {
  const root = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'width', value: '20px' }))
  const result = postcss(pxtrans({ platform: 'weapp', designWidth: 750 }))
    .process(root, { from: 'explicit.css' })
    .sync()

  expect(result.root.toString()).toContain('width: 20rpx')
  expect(root.source).toBeUndefined()
})
