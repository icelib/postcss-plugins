import type { ReplaceContext } from '../src/index'
import postcss from 'postcss'
import { declarationExists, walkAndReplaceValues } from '../src/index'

describe('whole-value transformation', () => {
  it('works without a regex and preserves declaration and media context', () => {
    const root = postcss.parse('@media (min-width: token()) {.rule{width:token()}}', { from: '/src/entry.css' })
    const contexts: ReplaceContext[] = []
    const values: string[] = []
    walkAndReplaceValues({
      root,
      propList: ['*'],
      mediaQuery: true,
      createValueTransformer: (context) => {
        contexts.push(context)
        return (value) => {
          values.push(value)
          return value.replace('token()', '16px')
        }
      },
    })

    expect(root.toString()).toBe('@media (min-width: 16px) {.rule{width:16px}}')
    expect(values).toEqual(['(min-width: token())', 'token()'])
    expect(contexts[0]).toEqual({ root, input: root.source!.input, filePath: root.source!.input.file, atRule: root.first })
    expect(contexts[1]).toMatchObject({
      root,
      input: root.source!.input,
      filePath: root.source!.input.file,
      atRule: root.first,
      prop: 'width',
      selector: '.rule',
    })
    expect(contexts[1]!.decl?.value).toBe('16px')
    expect(contexts[1]!.rule?.selector).toBe('.rule')
  })

  it('takes precedence over the regex and replacer without regex prefiltering', () => {
    const root = postcss.parse('.rule{width:token()}')
    const createReplacer = vi.fn(() => () => 'incorrect')
    walkAndReplaceValues({
      root,
      propList: ['*'],
      unitRegex: /never-matches/,
      createReplacer,
      createValueTransformer: () => value => value.replace('token()', '32rpx'),
    })
    expect(root.toString()).toBe('.rule{width:32rpx}')
    expect(createReplacer).not.toHaveBeenCalled()
  })

  it('shares property, selector and custom declaration filters', () => {
    const root = postcss.parse('.skip{width:token()}.keep{width:token();height:token();margin:token()}')
    const seen: string[] = []
    walkAndReplaceValues({
      root,
      propList: ['width', 'height'],
      selectorBlackList: ['.skip'],
      shouldProcessDecl: decl => decl.prop !== 'height',
      createValueTransformer: (context) => {
        seen.push(`${context.selector}:${context.prop}`)
        return value => value.replace('token()', '16px')
      },
    })
    expect(root.toString()).toBe('.skip{width:token()}.keep{width:16px;height:token();margin:token()}')
    expect(seen).toEqual(['.keep:width'])
  })

  it('shares entry-level exclusions before constructing the transformer', () => {
    const root = postcss.parse('.rule{width:token()}', { from: '/src/skip.css' })
    const createValueTransformer = vi.fn(() => () => '16px')
    walkAndReplaceValues({ root, propList: ['*'], exclude: ['skip.css'], createValueTransformer })
    expect(root.toString()).toBe('.rule{width:token()}')
    expect(createValueTransformer).not.toHaveBeenCalled()
  })

  it('keeps imported sources while exposing the root entry in the context', () => {
    const root = postcss.parse('/* entry */', { from: '/src/entry.css' })
    const imported = postcss.parse('.imported{width:token()}', { from: '/src/imported.css' })
    root.append(imported)
    const contexts: ReplaceContext[] = []
    walkAndReplaceValues({
      root,
      propList: ['*'],
      replace: false,
      exclude: ['imported.css'],
      createValueTransformer: (context) => {
        contexts.push(context)
        return value => value.replace('token()', '16px')
      },
    })
    const rule = root.last as postcss.Rule
    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.filePath).toBe(root.source!.input.file)
    expect(contexts[0]!.decl?.source?.input.file).toBe(imported.source!.input.file)
    expect(rule.last?.source).toBe(rule.first?.source)
    expect(root.toResult({ map: { inline: false, annotation: false } }).map?.toJSON().sources)
      .toEqual([
        expect.stringMatching(/(?:^|\/)src\/entry\.css$/),
        expect.stringMatching(/(?:^|\/)src\/imported\.css$/),
      ])
  })

  it('allows custom at-rules and exposes declarations directly inside them', () => {
    const root = postcss.parse('@supports (width:token()) {width:token()} @media (width:token()) {}')
    const contexts: ReplaceContext[] = []
    walkAndReplaceValues({
      root,
      propList: ['*'],
      mediaQuery: true,
      shouldProcessAtRule: atRule => atRule.name === 'supports',
      createValueTransformer: (context) => {
        contexts.push(context)
        return value => value.replace('token()', '16px')
      },
    })
    expect(root.toString()).toBe('@supports (width:16px) {width:16px} @media (width:token()) {}')
    expect(contexts).toHaveLength(2)
    expect(contexts[1]).toMatchObject({ atRule: root.first, prop: 'width' })
    expect(contexts[1]!.rule).toBeUndefined()
  })

  it('does not convert at-rule params unless mediaQuery is enabled', () => {
    const root = postcss.parse('@media (width:token()) {.rule{width:token()}}')
    walkAndReplaceValues({
      root,
      propList: ['*'],
      createValueTransformer: () => value => value.replace('token()', '16px'),
    })
    expect(root.toString()).toBe('@media (width:token()) {.rule{width:16px}}')
  })

  it('does not recursively process inserted fallbacks in the same walk', () => {
    const root = postcss.parse('.rule{width:1rem}')
    const transform = vi.fn((value: string) => `${Number.parseFloat(value) * 2}rem`)
    walkAndReplaceValues({ root, propList: ['*'], replace: false, createValueTransformer: () => transform })
    expect(root.toString()).toBe('.rule{width:1rem;width:2rem}')
    expect(transform).toHaveBeenCalledTimes(1)
  })

  it('leaves declarations and media params untouched when values are unchanged', () => {
    const root = postcss.parse('@media (width:16px) {.rule{width:16px}}')
    const atRule = root.first as postcss.AtRule
    const decl = (atRule.first as postcss.Rule).first
    walkAndReplaceValues({ root, propList: ['*'], mediaQuery: true, createValueTransformer: () => value => value })
    expect(root.first).toBe(atRule)
    expect((atRule.first as postcss.Rule).first).toBe(decl)
    expect(root.toString()).toBe('@media (width:16px) {.rule{width:16px}}')
  })

  it('returns early for roots without source input', () => {
    const createValueTransformer = vi.fn(() => () => '16px')
    walkAndReplaceValues({ root: postcss.root(), propList: ['*'], createValueTransformer })
    expect(createValueTransformer).not.toHaveBeenCalled()
  })

  it('accepts fallback input for source-less ASTs without attaching source metadata', () => {
    const root = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'width', value: 'token()' }))
    const input = new postcss.Input(root.toString(), { from: '/src/entry.css' })
    const contexts: ReplaceContext[] = []
    walkAndReplaceValues({
      root,
      input,
      propList: ['*'],
      createValueTransformer(context) {
        contexts.push(context)
        return value => value.replace('token()', '16px')
      },
    })
    expect(root.toString()).toContain('width: 16px')
    expect(contexts[0]!.input).toBe(input)
    expect(contexts[0]!.filePath).toBe(input.file)
    expect(root.source).toBeUndefined()
    expect(root.first!.source).toBeUndefined()
    expect((root.first as postcss.Rule).first!.source).toBeUndefined()
  })

  it('prioritizes the real root input over a supplied fallback', () => {
    const root = postcss.parse('.a{width:token()}', { from: '/src/real.css' })
    const contexts: ReplaceContext[] = []
    walkAndReplaceValues({
      root,
      input: new postcss.Input('', { from: '/src/fallback.css' }),
      propList: ['*'],
      createValueTransformer(context) {
        contexts.push(context)
        return value => value.replace('token()', '16px')
      },
    })
    expect(contexts[0]!.input).toBe(root.source!.input)
    expect(contexts[0]!.filePath).toBe(root.source!.input.file)
  })

  it.each([
    {},
    { unitRegex: /rem/g },
    { createReplacer: () => (value: string) => value },
  ])('rejects an incomplete transformation strategy: %j', (strategy) => {
    expect(() => walkAndReplaceValues({ root: postcss.parse('.rule{width:1rem}'), propList: ['*'], ...strategy }))
      .toThrow('requires createValueTransformer or both unitRegex and createReplacer')
  })
})

describe('importance-aware declarations', () => {
  it.each([true, false])('supports explicit importance in .some and array-like containers: %s', (important) => {
    const decl = postcss.decl({ prop: 'width', value: '16px', important })
    const nodes = [postcss.comment({ text: 'non-declaration' }), decl]
    const containers = [nodes, { some: (callback: (node: postcss.ChildNode) => boolean) => nodes.some(callback) }]
    for (const container of containers) {
      expect(declarationExists(container, 'width', '16px')).toBe(true)
      expect(declarationExists(container, 'width', '16px', important)).toBe(true)
      expect(declarationExists(container, 'width', '16px', !important)).toBe(false)
      expect(declarationExists(container, 'height', '16px', important)).toBe(false)
    }
  })

  it.each([
    ['16px;token()!important', '16px;token()!important;16px!important'],
    ['16px!important;token()', '16px!important;token();16px'],
    ['16px!important;token()!important', '16px!important;token()!important'],
    ['token()!important;token()!important', 'token()!important;16px!important;token()!important'],
    ['token();token()!important', 'token();16px;token()!important;16px!important'],
  ])('deduplicates fallback by value and importance: %s', (input, expected) => {
    const css = (values: string) => `.rule{${values.split(';').map(value => `width:${value}`).join(';')}}`
    const root = postcss.parse(css(input))
    walkAndReplaceValues({
      root,
      propList: ['*'],
      replace: false,
      createValueTransformer: () => value => value.replace('token()', '16px'),
    })
    expect(root.toString()).toBe(css(expected))
  })

  it('applies importance-aware fallback deduplication to legacy regex callers', () => {
    const root = postcss.parse('.rule{width:16px;width:1rem!important}')
    walkAndReplaceValues({
      root,
      propList: ['*'],
      replace: false,
      unitRegex: /(\d+)rem/g,
      createReplacer: () => (_match, value) => `${Number(value) * 16}px`,
    })
    expect(root.toString()).toBe('.rule{width:16px;width:1rem!important;width:16px!important}')
  })
})
