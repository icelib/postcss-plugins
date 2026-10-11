import type { Plugin } from 'postcss'
import type { RuleContext, UserDefinedOptions } from '../src/index'
import path from 'node:path'
import postcss from 'postcss'
import unitConverter from '../src/index'
import { createValueTransformer } from '../src/tokenize'

function convert(input: string, options: UserDefinedOptions = {}) {
  return postcss(unitConverter({
    rules: [{ from: 'rem', to: 'px', factor: 16 }],
    ...options,
  })).process(input, { from: '/src/entry.css' }).css
}

describe('CSS token conversion', () => {
  it('converts complete signed, fractional, and scientific numeric tokens', () => {
    expect(convert('.a { margin: -2rem +2rem .5rem -.5rem +.5rem 1e3rem 1e-3rem -1E+2rem; }'))
      .toBe('.a { margin: -32px +32px 8px -8px +8px 16000px 0.016px -1600px; }')
  })

  it('provides the signed number and original spellings with decoded unit matching', () => {
    const contexts: Array<{ value: number, from: string, raw: string, number: string, match: string }> = []
    const css = convert(String.raw`.a { a: -2REM; b: +.5r\65 m; c: 1e-3\72 em; }`, {
      rules: [{
        from: ' Rem ',
        to: 'px',
        transform(value, context) {
          contexts.push({ value, from: context.fromUnit, raw: context.rawUnit, number: context.rawValue, match: context.match })
          return value + 1
        },
      }],
    })

    expect(css).toBe('.a { a: -1px; b: +1.5px; c: 1.001px; }')
    expect(contexts).toEqual([
      { value: -2, from: 'rem', raw: 'REM', number: '-2', match: '-2REM' },
      { value: 0.5, from: 'rem', raw: String.raw`r\65 m`, number: '+.5', match: String.raw`+.5r\65 m` },
      { value: 0.001, from: 'rem', raw: String.raw`\72 em`, number: '1e-3', match: String.raw`1e-3\72 em` },
    ])
  })

  it('does not convert partial identifiers, complete longer units, strings, comments, or URLs', () => {
    const value = String.raw`2remfoo foo2rem _2rem --2rem 2rem-foo 像素2rem 2像素 "escaped\" 2rem" 'escaped\' 2rem' url(2rem.png) URL(2rem.png) u\72l(2rem.png) URL("2rem.png") /* 2rem */ 2rem`
    const transform = createValueTransformer((match, number, _rawUnit, unit) => unit.toLowerCase() === 'rem' ? `${Number(number) * 16}px` : match)

    expect(transform(value)).toBe(`${value.slice(0, -4)}32px`)
    expect(transform('url(a"2rem) 3rem')).toBe('url(a"2rem) 48px')
    expect(transform('url(2rem')).toBe('url(2rem')
    expect(transform('URL("2rem" 3rem) 4rem')).toBe('URL("2rem" 3rem) 64px')
  })

  it('skips var() entirely at any depth and accepts escaped and uppercase function names', () => {
    const input = String.raw`.a { a: calc(1rem + var(--x, min(2rem, max(3rem, calc(4rem + 5rem)))) + 6rem); b: VAR(--x, 7rem); c: v\61 r(--x, 8rem); }`
    const output = String.raw`.a { a: calc(16px + var(--x, min(2rem, max(3rem, calc(4rem + 5rem)))) + 96px); b: VAR(--x, 7rem); c: v\61 r(--x, 8rem); }`

    expect(convert(input)).toBe(output)
    const transform = createValueTransformer((_match, number) => `${Number(number) * 16}px`)
    expect(transform('var(--x, [1rem {2rem} (3rem)]) 4rem')).toBe('var(--x, [1rem {2rem} (3rem)]) 64px')
    expect(transform('var(--x, [) 1rem] ) 2rem')).toBe('var(--x, [) 1rem] ) 32px')
    expect(transform('var(--x, calc(1rem')).toBe('var(--x, calc(1rem')
  })

  it('supports percentages, non-ASCII units, and case-normalized complex matchers', () => {
    expect(convert(String.raw`.a { a: 25%; b: 3像素; c: 2FOO; d: 2\66 oo; }`, {
      rules: [
        { from: '%', to: 'px', factor: 2 },
        { from: '像素', to: 'px', factor: 3 },
        { from: unit => unit === 'foo', to: 'px', factor: 4 },
      ],
    })).toBe('.a { a: 50px; b: 9px; c: 8px; d: 8px; }')
  })

  it('uses absolute magnitude for global and per-rule minima while keeping zero behavior', () => {
    const input = '.a { a: -2rem; b: -0.5rem; c: 2rem; d: 0rem; e: -0rem; f: 0.5rem; }'
    expect(convert(input, { minValue: 1 })).toBe('.a { a: -32px; b: -0.5rem; c: 32px; d: 0rem; e: -0rem; f: 0.5rem; }')
    expect(convert(input, { minValue: 10, rules: [{ from: 'rem', to: 'px', factor: 16, minValue: 0.5 }] }))
      .toBe('.a { a: -32px; b: -8px; c: 32px; d: 0rem; e: -0rem; f: 8px; }')
    expect(convert('.a { a: -0rem; b: +0rem; c: 0rem; }')).toBe('.a { a: 0; b: 0; c: 0; }')
    expect(convert('.a { a: -0rem; b: +0rem; c: 0rem; }', { keepZeroUnit: true })).toBe('.a { a: 0px; b: +0px; c: 0px; }')
  })

  it('negates signed values without duplicate signs and rounds at configured precision', () => {
    expect(convert('.a { a: -2rem; b: +2rem; c: 2rem; }', {
      rules: [{ from: 'rem', to: 'px', transform: value => -value }],
    })).toBe('.a { a: 2px; b: -2px; c: -2px; }')
    expect(convert('.a { a: -1.005rem; b: 0.00001rem; }', {
      rules: [{ from: 'rem', to: 'px', factor: 1 }],
      unitPrecision: 2,
    })).toBe('.a { a: -1.01px; b: 0; }')
  })

  it('does not match converted output against subsequent rules, but permits another pass', () => {
    const options = { rules: [{ from: 'rem', to: 'px', factor: 2 }, { from: 'px', to: 'rem', factor: 3 }] }
    const first = convert('.a { width: 1rem; }', options)
    expect(first).toBe('.a { width: 2px; }')
    expect(convert(first, options)).toBe('.a { width: 6rem; }')
    expect(convert('.a { width: 1rem; }', {
      rules: [{ from: /^rem$/, transform: () => undefined }, { from: 'rem', to: 'px', factor: 2 }],
    })).toBe('.a { width: 1rem; }')
  })

  it('separates important fallback declarations and remains finite when a processor is reused', () => {
    const input = '.a { width: 1rem !important; width: 16px; height: 1rem; height: 16px !important; }'
    expect(convert(input, { replace: false }))
      .toBe('.a { width: 1rem !important; width: 16px !important; width: 16px; height: 1rem; height: 16px; height: 16px !important; }')
    const processor = postcss(unitConverter({ rules: [{ from: 'rem', to: 'px', factor: 16 }], replace: false }))
    const first = processor.process('.a { width: 1rem !important; width: 16px !important; }', { from: '/src/first.css' }).css
    expect(first).toBe('.a { width: 1rem !important; width: 16px !important; }')
    expect(processor.process(first, { from: '/src/again.css' }).css).toBe(first)
  })

  it('resolves dynamic unit matchers separately for each root when a processor is reused', () => {
    let enabled = false
    const processor = postcss(unitConverter({
      rules: [{ from: unit => enabled && unit === 'rem', to: 'px', factor: 16 }],
    }))
    expect(processor.process('.a { width: 1rem; }', { from: '/src/first.css' }).css).toBe('.a { width: 1rem; }')
    enabled = true
    expect(processor.process('.a { width: 2rem; }', { from: '/src/second.css' }).css).toBe('.a { width: 32px; }')
  })

  it('keeps custom regex capture and protection semantics independent of tokenization', () => {
    expect(convert('.a { width: var(--x, -2rem); label: item2rem; }', {
      rules: [{ from: 'rem', to: 'px', transform: value => value + 1 }],
      unitRegex: /([+-]?\d+)(rem)/g,
    })).toBe('.a { width: var(--x, -1px); label: item3px; }')
  })

  it('uses tokenized media params with the same filtering and whole-value protection', () => {
    const input = '@media (min-width: 1e2REM) { .a { width: 1rem; margin: 2rem; } .skip { width: 3rem; } } @supports (width: 1rem) { .b { width: 4rem; } }'
    expect(convert(input, { propList: ['width'], selectorBlackList: ['.skip'], mediaQuery: true }))
      .toBe('@media (min-width: 1600px) { .a { width: 16px; margin: 2rem; } .skip { width: 3rem; } } @supports (width: 1rem) { .b { width: 64px; } }')
  })

  it('retains sources and source maps while exposing the entry context', () => {
    const root = postcss.parse('.a { width: 2rem; }', { from: '/vendor/imported.css' })
    const entry = postcss.parse('', { from: '/src/entry.css' })
    entry.append(root.nodes)
    let seen: RuleContext | undefined
    const result = postcss(unitConverter({
      rules: [{
        from: 'rem',
        to: 'px',
        transform(value, context) {
          seen = context
          return value * 16
        },
      }],
      exclude: ['imported.css'],
    })).process(entry, { from: '/src/entry.css', to: '/dist/output.css', map: { inline: false } })

    expect(result.css).toContain('32px')
    expect(seen?.filePath).toBe(entry.source!.input.file)
    expect(seen?.decl?.source?.input.file).toBe(root.source!.input.file)
    expect(result.map?.toJSON().sources).toContain('../vendor/imported.css')
  })

  it('does not convert non-finite numbers or invalid callback results', () => {
    const input = '.a { a: 1e999rem; b: 2foo; c: 2bar; d: 2baz; e: 2qux; }'
    expect(convert(input, {
      rules: [
        { from: 'rem', to: 'px', factor: 2 },
        { from: 'foo', transform: () => 'invalid' as any },
        { from: 'bar', transform: () => ({}) as any },
        { from: 'baz', transform: () => ({ value: '2' }) as any },
        { from: 'qux', transform: () => ({ value: 2, unit: 42 }) as any },
      ],
    })).toBe(input)
  })

  it('validates named captures and ignores non-capturing groups, lookarounds, escaped and bracketed parentheses', () => {
    expect(convert('.a { width: 2rem; }', { unitRegex: /(?<number>\d+)(?<unit>rem)/g }))
      .toBe('.a { width: 32px; }')
    expect(convert('.a { width: (2rem); }', { unitRegex: /(?<=\()(\d+)(rem)(?=[()])/g }))
      .toBe('.a { width: (32px); }')
    expect(convert('.a { width: x2rem 2rem; }', { unitRegex: /(?<!x)(\d+)((?:re|e)m)/g }))
      .toBe('.a { width: x2rem 32px; }')
    expect(convert('.a { width: (2rem); }', { unitRegex: /\((\d+)(rem)\)/g }))
      .toBe('.a { width: 32px; }')
    expect(convert('.a { width: 2rem; }', { unitRegex: /(\d+)(rem)|word/g })).toBe('.a { width: 32px; }')
    expect(convert('.a { custom: word; width: 2rem; }', { unitRegex: /(\d+)(rem)|word/g }))
      .toBe('.a { custom: word; width: 32px; }')
  })

  it('keeps a rule with no conversion and does not let duplicate string rules override the first', () => {
    expect(convert('.a { width: 2rem; }', { rules: [{ from: 'rem' }, { from: 'rem', to: 'px', factor: 16 }] }))
      .toBe('.a { width: 2rem; }')
    expect(convert('.a { width: 2foo; }', { rules: [{ from: /^bar$/, to: 'px', factor: 16 }] }))
      .toBe('.a { width: 2foo; }')
  })

  it.each([undefined, path.resolve('src/explicit.css')])('converts source-less ASTs with ephemeral input context: %s', (from) => {
    const root = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'width', value: '2rem' }))
    const contexts: RuleContext[] = []
    const result = postcss(unitConverter({
      rules: [{
        from: 'rem',
        to: 'px',
        transform(value, context) {
          contexts.push(context)
          return value * 16
        },
      }],
    })).process(root, { from, map: { inline: false, annotation: false } })

    expect(result.css).toContain('width: 32px')
    expect(contexts[0]!.filePath).toBe(from)
    expect(contexts[0]!.input.file).toBe(from)
    expect(contexts[0]!.input.css).toContain('width: 2rem')
    expect(root.source).toBeUndefined()
    root.walk(node => expect(node.source).toBeUndefined())
    expect(result.map!.toJSON().sources).toEqual(['<no source>'])
  })

  it('applies explicit entry exclusions to source-less ASTs', () => {
    const root = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'width', value: '2rem' }))
    const transform = vi.fn(value => value * 16)
    const processor = postcss(unitConverter({ rules: [{ from: 'rem', to: 'px', transform }], exclude: ['excluded.css'] }))

    expect(processor.process(root, { from: '/src/excluded.css' }).sync().root.toString()).toContain('width: 2rem')
    expect(transform).not.toHaveBeenCalled()
    expect(root.source).toBeUndefined()
  })

  it('retains direct legacy hook behavior with and without source Input', () => {
    const once = (unitConverter({ rules: [{ from: 'rem', to: 'px', factor: 16 }] }) as Plugin).Once!
    const callLegacyHook = once as (root: postcss.Root) => void
    const sourceLess = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'width', value: '2rem' }))
    expect(() => callLegacyHook(sourceLess)).not.toThrow()
    expect(sourceLess.toString()).toContain('width: 2rem')
    const sourced = postcss.parse('.a{width:2rem}')
    callLegacyHook(sourced)
    expect(sourced.toString()).toBe('.a{width:32px}')
  })

  it('does not parse source-map annotations when creating ephemeral callback context', () => {
    const root = postcss.root().append(postcss.rule({ selector: '.a' }).append({ prop: 'width', value: '2rem' })).append(postcss.comment({ text: '# sourceMappingURL=data:application/json;base64,invalid' }))
    const result = postcss(unitConverter({ rules: [{ from: 'rem', to: 'px', factor: 16 }] }))
      .process(root, { from: undefined })
      .sync()

    expect(result.root.toString()).toContain('width: 32px')
    expect(result.root.toString()).toContain('sourceMappingURL=data:application/json;base64,invalid')
    expect(root.source).toBeUndefined()
  })
})
