import postcss from 'postcss'
import remToViewport from '../src/index'

it('preserves native PostCSS context for source-less AST input', () => {
  const root = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'font-size', value: '2rem' }))
  const result = postcss(remToViewport({ rootValue: input => input.file?.endsWith('explicit.css') ? 320 : 375 }))
    .process(root, { from: 'explicit.css' })
    .sync()

  expect(result.root.toString()).toContain('font-size: 10vw')
  expect(root.source).toBeUndefined()
})
