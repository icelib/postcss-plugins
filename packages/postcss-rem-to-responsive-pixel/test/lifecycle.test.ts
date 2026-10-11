import postcss from 'postcss'
import remToResponsivePixel from '../src/index'

it.each(['Once', 'OnceExit'] as const)('preserves native PostCSS context at %s for source-less AST input', (processorStage) => {
  const root = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'font-size', value: '2rem' }))
  const processor = postcss(remToResponsivePixel({ processorStage, rootValue: input => input.file?.endsWith('explicit.css') ? 20 : 16 }))
  const result = processor.process(root, { from: 'explicit.css' }).sync()

  expect(result.root.toString()).toContain('font-size: 40px')
  expect(root.source).toBeUndefined()
})
