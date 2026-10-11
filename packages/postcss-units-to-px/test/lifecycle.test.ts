import postcss from 'postcss'
import unitsToPx from '../src/index'

it('preserves native PostCSS context for source-less AST input', () => {
  const root = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'font-size', value: '2rem' }))
  const result = postcss(unitsToPx({ unitMap: { rem: (value, context) => context.input.file?.endsWith('explicit.css') ? value * 20 : value * 16 } }))
    .process(root, { from: 'explicit.css' })
    .sync()

  expect(result.root.toString()).toContain('font-size: 40px')
  expect(root.source).toBeUndefined()
})
