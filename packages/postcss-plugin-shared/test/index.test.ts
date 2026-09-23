import postcss from 'postcss'
import {
  blacklistedSelector,
  createAdvancedPropListMatcher,
  createConfigGetter,
  createExcludeMatcher,
  createPropListMatcher,
  createSelectorBlacklistMatcher,
  createUnitRegex,
  declarationExists,
  maybeBlacklistedSelector,
  mergeOptions,
  pxRegex,
  remRegex,
  toFixed,
  walkAndReplaceValues,
} from '../src/index'

describe('postcss-plugin-shared', () => {
  describe('toFixed', () => {
    it('returns 0 early for 0 input', () => {
      expect(toFixed(0, 2)).toBe(0)
      expect(toFixed(-0, 5)).toBe(0)
    })

    it('rounds positive and negative numbers with precision', () => {
      expect(toFixed(0.12345, 2)).toBe(0.12)
      expect(toFixed(0.1299, 2)).toBe(0.13)
      expect(toFixed(-0.1299, 2)).toBe(-0.13)
    })
  })

  describe('mergeOptions', () => {
    it('fills missing values from defaults', () => {
      const merged = mergeOptions(undefined, { rootValue: 16, propList: ['*'] })
      expect(merged).toEqual({ rootValue: 16, propList: ['*'] })
    })

    it('does not merge arrays; options arrays win', () => {
      const merged = mergeOptions(
        {
          propList: ['color'],
          nested: {
            list: ['a'],
          },
        },
        {
          rootValue: 16,
          propList: ['*'],
          nested: {
            list: ['b', 'c'],
            enabled: true,
          },
        },
      )

      expect(merged.rootValue).toBe(16)
      expect(merged.propList).toEqual(['color'])
      expect(merged.nested).toEqual({ enabled: true, list: ['a'] })
    })

    it('keeps primitive option values when defaults have arrays', () => {
      const merged = mergeOptions(
        { propList: '*' as unknown as string[] },
        { propList: ['a', 'b'] },
      )
      expect(merged.propList).toBe('*')
    })
  })

  describe('createConfigGetter', () => {
    it('creates a getConfig helper that merges with defaults', () => {
      const defaults = { rootValue: 16, propList: ['*'] as string[] }
      const getConfig = createConfigGetter(defaults)

      expect(getConfig()).toEqual(defaults)
      expect(getConfig({ rootValue: 10 })).toEqual({ rootValue: 10, propList: ['*'] })
      expect(getConfig({ propList: ['color'] })).toEqual({ rootValue: 16, propList: ['color'] })
    })
  })

  describe('declarationExists', () => {
    it('returns true only for matching decl nodes', () => {
      const root = postcss.parse('.rule { /* non-decl */ font-size: 16px; line-height: 24px; }')
      const rule = root.first!

      expect(declarationExists(rule as any, 'font-size', '16px')).toBe(true)
      expect(declarationExists(rule as any, 'font-size', '1rem')).toBe(false)
    })

    it('returns false when there are no decl nodes', () => {
      const root = postcss.parse('.rule { /* only comment */ }')
      const rule = root.first!
      expect(declarationExists(rule as any, 'font-size', '16px')).toBe(false)
    })

    it('falls back to .some() when declarations are not index-addressable', () => {
      const nodes = [
        { type: 'comment' },
        { type: 'decl', prop: 'font-size', value: '16px' },
      ]

      const decls = {
        some(cb: (node: any) => boolean) {
          return nodes.some(cb)
        },
      }

      expect(declarationExists(decls as any, 'font-size', '16px')).toBe(true)
      expect(declarationExists(decls as any, 'font-size', '12px')).toBe(false)
    })

    it('supports array-like declaration containers without relying on .some()', () => {
      const decls = {
        0: { type: 'comment' },
        1: { type: 'decl', prop: 'font-size', value: '16px' },
        length: 2,
        some() {
          throw new Error('should not use .some for array-like containers')
        },
      }

      expect(declarationExists(decls as any, 'font-size', '16px')).toBe(true)
      expect(declarationExists(decls as any, 'line-height', '16px')).toBe(false)
    })
  })

  describe('regex', () => {
    it('remRegex ignores quoted strings, url() and var()', () => {
      const input = `a:"1rem";b:'2rem';c:url(/3rem.png);d:var(--x,4rem);e:5rem;`
      const output = input.replace(remRegex, (match, value?: string) => {
        return value ? `${value}REM` : match
      })

      expect(output).toContain(`a:"1rem"`)
      expect(output).toContain(`b:'2rem'`)
      expect(output).toContain('c:url(/3rem.png)')
      expect(output).toContain('d:var(--x,4rem)')
      expect(output).toContain('e:5REM')
    })

    it('pxRegex ignores quoted strings, url() and var()', () => {
      const input = `a:"1px";b:'2px';c:url(/3px.png);d:var(--x,4px);e:5px;`
      const output = input.replace(pxRegex, (match, value?: string) => {
        return value ? `${value}PX` : match
      })

      expect(output).toContain(`a:"1px"`)
      expect(output).toContain(`b:'2px'`)
      expect(output).toContain('c:url(/3px.png)')
      expect(output).toContain('d:var(--x,4px)')
      expect(output).toContain('e:5PX')
    })

    it('createUnitRegex can be configured to not skip var()', () => {
      const re = createUnitRegex({ units: ['px'], skipVar: false })
      const input = 'a:var(--x,4px);b:5px;'
      const output = input.replace(re, (match, value?: string) => {
        return value ? `${value}PX` : match
      })

      expect(output).toBe('a:var(--x,4PX);b:5PX;')
    })

    it('skips units in nested var() fallbacks', () => {
      const re = createUnitRegex({ units: ['px'] })
      const input = 'a:var(--gap,calc(1px + 2px));b:3px;'
      const output = input.replace(re, (match, value?: string) => {
        return value ? `${value}PX` : match
      })

      expect(output).toBe('a:var(--gap,calc(1px + 2px));b:3PX;')
    })

    it('createUnitRegex can opt out of quote/url skipping', () => {
      const re = createUnitRegex({
        units: ['px'],
        skipDoubleQuotes: false,
        skipSingleQuotes: false,
        skipUrl: false,
        skipVar: false,
      })
      const input = `a:"1px";b:'2px';c:url(3px);d:var(--x,4px);e:5px;`
      const output = input.replace(re, (match, value?: string) => {
        return value ? `${value}PX` : match
      })

      expect(output).toBe(`a:"1PX";b:'2PX';c:url(3PX);d:var(--x,4PX);e:5PX;`)
    })

    it('createUnitRegex supports ignoreCase matching', () => {
      const re = createUnitRegex({ units: ['px'], ignoreCase: true })
      const input = 'a:1PX;b:2px;'
      const output = input.replace(re, (match, value?: string) => {
        return value ? `${value}PX` : match
      })

      expect(output).toBe('a:1PX;b:2PX;')
    })

    it('matches longer overlapping units before shorter units', () => {
      const re = createUnitRegex({ units: ['p', 'px'] })
      const output = 'a:1px;b:2p;'.replace(re, match => match.toUpperCase())

      expect(output).toBe('a:1PX;b:2P;')
    })
  })

  describe('selectors', () => {
    it('blacklistedSelector supports missing selectors, string rules and regex rules', () => {
      expect(blacklistedSelector(['.forbidden'], undefined)).toBe(false)
      expect(blacklistedSelector(['.forbidden'], '.forbidden button')).toBe(true)
      expect(blacklistedSelector(['.forbidden'], '.allowed button')).toBe(false)
      expect(blacklistedSelector([/body$/], '.page-body')).toBe(true)
      expect(blacklistedSelector([/body$/], '.page-body .content')).toBe(false)
    })

    it('maybeBlacklistedSelector returns undefined for non-string selectors', () => {
      expect(maybeBlacklistedSelector(['.forbidden'], undefined)).toBeUndefined()
      expect(maybeBlacklistedSelector(['.forbidden'], '.forbidden button')).toBe(true)
      expect(maybeBlacklistedSelector(['.forbidden'], '.allowed button')).toBe(false)
    })

    it('createPropListMatcher respects wildcards', () => {
      const anyProp = createPropListMatcher(['*'])
      expect(anyProp('border-left')).toBe(true)
      expect(anyProp('anything')).toBe(true)
    })

    it('createPropListMatcher matches string and regex entries', () => {
      const matcher = createPropListMatcher(['font', /^margin$/])
      expect(matcher('margin')).toBe(true)
      expect(matcher('font-size')).toBe(true)
      expect(matcher('padding')).toBe(false)
    })

    it('createPropListMatcher supports negated string entries', () => {
      const matcher = createPropListMatcher(['*', '!font-size', '!padding*', 'line'])
      expect(matcher('margin')).toBe(true)
      expect(matcher('font-size')).toBe(false)
      expect(matcher('padding-right')).toBe(false)
      expect(matcher('line-height')).toBe(true)
    })

    it('createPropListMatcher supports glob-style negated custom property entries', () => {
      const matcher = createPropListMatcher([
        '*',
        '!font-size',
        '!line-height',
        '!font',
        '!--wot-*',
        '!--wot-fs-*',
        '!--wot-*-font-size',
      ])

      expect(matcher('margin')).toBe(true)
      expect(matcher('font-size')).toBe(false)
      expect(matcher('line-height')).toBe(false)
      expect(matcher('font')).toBe(false)
      expect(matcher('--wot-color')).toBe(false)
      expect(matcher('--wot-fs-title')).toBe(false)
      expect(matcher('--wot-body-font-size')).toBe(false)
      expect(matcher('--other-font-size')).toBe(true)
    })

    it('createExcludeMatcher handles undefined file paths', () => {
      const matcher = createExcludeMatcher(['node_modules'])
      expect(matcher(undefined)).toBe(false)
    })

    it('createExcludeMatcher supports arrays', () => {
      const matcher = createExcludeMatcher(['node_modules', /\.stories\.tsx$/])
      expect(matcher('/project/node_modules/foo.css')).toBe(true)
      expect(matcher('/project/Button.stories.tsx')).toBe(true)
      expect(matcher('/project/Button.tsx')).toBe(false)
    })

    it('createExcludeMatcher supports functions', () => {
      const matcher = createExcludeMatcher(filepath => filepath.includes('skip-me'))
      expect(matcher('/project/skip-me.css')).toBe(true)
      expect(matcher('/project/keep-me.css')).toBe(false)
    })

    it('createSelectorBlacklistMatcher caches rule checks', () => {
      const root = postcss.parse('.skip { color: red; } .keep { color: blue; }')
      const rules = root.nodes.filter(node => node.type === 'rule')
      const matcher = createSelectorBlacklistMatcher(['.skip'])

      const firstRule = rules[0] as any
      const secondRule = rules[1] as any

      expect(matcher(firstRule)).toBe(true)
      expect(matcher(firstRule)).toBe(true)
      expect(matcher(secondRule)).toBe(false)
    })

    it('createSelectorBlacklistMatcher handles empty blacklist and no cache', () => {
      const root = postcss.parse('.skip { color: red; }')
      const rule = root.nodes[0] as any
      const matcher = createSelectorBlacklistMatcher([], { cache: false })

      expect(matcher(rule)).toBe(false)
    })

    it('createSelectorBlacklistMatcher works without cache', () => {
      const root = postcss.parse('.skip { color: red; }')
      const rule = root.nodes[0] as any
      const matcher = createSelectorBlacklistMatcher(['.skip'], { cache: false })

      expect(matcher(rule)).toBe(true)
    })

    it('createAdvancedPropListMatcher supports include/exclude patterns', () => {
      const matcher = createAdvancedPropListMatcher([
        '*',
        '!border',
        'font*',
        '*height',
        '*margin*',
        '!*padding*',
      ])

      expect(matcher('font-size')).toBe(true)
      expect(matcher('line-height')).toBe(true)
      expect(matcher('margin-left')).toBe(true)
      expect(matcher('padding-left')).toBe(false)
      expect(matcher('border')).toBe(false)
    })

    it('createAdvancedPropListMatcher covers exact and negated patterns', () => {
      const matcher = createAdvancedPropListMatcher([
        '*',
        'exact',
        'start*',
        '*end',
        '*mid*',
        '!block',
        '!*nope*',
        '!prefix*',
        '!*suffix',
      ])

      expect(matcher('exact')).toBe(true)
      expect(matcher('start-here')).toBe(true)
      expect(matcher('the-end')).toBe(true)
      expect(matcher('xmidy')).toBe(true)
      expect(matcher('block')).toBe(false)
      expect(matcher('xxnopeyy')).toBe(false)
      expect(matcher('prefixValue')).toBe(false)
      expect(matcher('valuesuffix')).toBe(false)
    })

    it('createAdvancedPropListMatcher returns true when only wildcard provided', () => {
      const matcher = createAdvancedPropListMatcher(['*'])
      expect(matcher('anything')).toBe(true)
    })

    it('createAdvancedPropListMatcher covers endWith without wildcard', () => {
      const matcher = createAdvancedPropListMatcher(['*end'])
      expect(matcher('line-end')).toBe(true)
      expect(matcher('line-start')).toBe(false)
    })

    it('createAdvancedPropListMatcher supports arbitrary glob positions', () => {
      const matcher = createAdvancedPropListMatcher([
        '*',
        'custom-*-size',
        '!*temp*',
        '!--wot-*-font-size',
      ])

      expect(matcher('custom-button-size')).toBe(true)
      expect(matcher('custom-button-color')).toBe(true)
      expect(matcher('--wot-body-font-size')).toBe(false)
      expect(matcher('my-temp-token')).toBe(false)
    })
  })

  describe('walkAndReplaceValues', () => {
    const unitRegex = createUnitRegex({ units: ['rem'] })

    it('returns early when root has no input', () => {
      const root = postcss.root()
      let called = false
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        createReplacer: () => {
          called = true
          return m => m
        },
      })

      expect(called).toBe(false)
    })

    it('skips excluded files', () => {
      const root = postcss.parse('.rule{width:1rem}', { from: '/src/skip.css' })
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        exclude: ['skip.css'],
        createReplacer: () => (_m, value) => `${value}px`,
      })

      expect(root.toString()).toBe('.rule{width:1rem}')
    })

    it('respects propList and shouldProcessDecl', () => {
      const root = postcss.parse('.rule{width:1rem;height:1rem}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['height'],
        shouldProcessDecl: () => false,
        createReplacer: () => (_m, value) => `${value}PX`,
      })

      expect(root.toString()).toBe('.rule{width:1rem;height:1rem}')
    })

    it('continues when shouldProcessDecl returns true but no unit matches', () => {
      const root = postcss.parse('.rule{width:1em}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['width'],
        shouldProcessDecl: () => true,
        createReplacer: () => (_m, value) => `${value}PX`,
      })

      expect(root.toString()).toBe('.rule{width:1em}')
    })

    it('uses context without filePath when missing', () => {
      const root = postcss.parse('.rule{width:1rem}')
      const seen: Array<string | undefined> = []
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        createReplacer: (context) => {
          seen.push(context.filePath)
          return (_m, value) => `${Number(value) * 2}px`
        },
      })

      expect(seen).toEqual([undefined])
      expect(root.toString()).toBe('.rule{width:2px}')
    })

    it('includes filePath in context when available', () => {
      const root = postcss.parse('.rule{width:1rem}', { from: '/src/keep.css' })
      const seen: Array<string | undefined> = []
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        createReplacer: (context) => {
          seen.push(context.filePath)
          return (_m, value) => `${Number(value) * 2}px`
        },
      })

      expect(seen).toEqual(['/src/keep.css'])
      expect(root.toString()).toBe('.rule{width:2px}')
    })

    it('skips duplicate declarations when enabled', () => {
      const root = postcss.parse('.rule{width:1rem;width:2px}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        createReplacer: () => (_m, value) => `${Number(value) * 2}px`,
      })

      expect(root.toString()).toBe('.rule{width:1rem;width:2px}')
    })

    it('allows duplicates when skipDuplicate is false', () => {
      const root = postcss.parse('.rule{width:1rem;width:2px}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        skipDuplicate: false,
        createReplacer: () => (_m, value) => `${Number(value) * 2}px`,
      })

      expect(root.toString()).toBe('.rule{width:2px;width:2px}')
    })

    it('clones declarations when replace is false', () => {
      const root = postcss.parse('.rule{width:1rem}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        replace: false,
        createReplacer: () => (_m, value) => `${Number(value) * 2}px`,
      })

      expect(root.toString()).toBe('.rule{width:1rem;width:2px}')
    })

    it('does not reprocess generated fallbacks', () => {
      const root = postcss.parse('.rule{width:1rem}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        replace: false,
        createReplacer: () => (_m, value) => `${Number(value) * 2}rem`,
      })

      expect(root.toString()).toBe('.rule{width:1rem;width:2rem}')
    })

    it('normalizes non-global regexes and visits every match', () => {
      const root = postcss.parse('.rule{width:1rem 2rem}')
      walkAndReplaceValues({
        root,
        unitRegex: /(\d+)(rem)/,
        propList: ['*'],
        createReplacer: () => (_m, value) => `${Number(value) * 2}px`,
      })

      expect(root.toString()).toBe('.rule{width:2px 4px}')
    })

    it('skips when replacer does not change the value', () => {
      const root = postcss.parse('.rule{width:1rem}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        createReplacer: () => _m => _m,
      })

      expect(root.toString()).toBe('.rule{width:1rem}')
    })

    it('respects selector blacklist', () => {
      const root = postcss.parse('.skip{width:1rem}.keep{width:1rem}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        selectorBlackList: ['.skip'],
        createReplacer: () => (_m, value) => `${Number(value) * 2}px`,
      })

      expect(root.toString()).toBe('.skip{width:1rem}.keep{width:2px}')
    })

    it('processes media params when enabled', () => {
      const root = postcss.parse('@media (min-width: 10rem) {.rule{width:1rem}}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        mediaQuery: true,
        createReplacer: () => (_m, value) => `${Number(value) * 2}px`,
      })

      expect(root.toString()).toBe('@media (min-width: 20px) {.rule{width:2px}}')
    })

    it('respects shouldProcessAtRule and skips params without units', () => {
      const root = postcss.parse('@media (min-width: 10em) {.rule{width:1rem}}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        mediaQuery: true,
        shouldProcessAtRule: () => false,
        createReplacer: () => (_m, value) => `${Number(value) * 2}px`,
      })

      expect(root.toString()).toBe('@media (min-width: 10em) {.rule{width:2px}}')
    })

    it('skips media params without matching units', () => {
      const root = postcss.parse('@media (min-width: 10px) {.rule{width:1rem}}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        mediaQuery: true,
        createReplacer: () => (_m, value) => `${Number(value) * 2}px`,
      })

      expect(root.toString()).toBe('@media (min-width: 10px) {.rule{width:2px}}')
    })

    it('does not update media params when replacer returns same value', () => {
      const root = postcss.parse('@media (min-width: 10rem) {.rule{width:1rem}}')
      walkAndReplaceValues({
        root,
        unitRegex,
        propList: ['*'],
        mediaQuery: true,
        createReplacer: () => _m => _m,
      })

      expect(root.toString()).toBe('@media (min-width: 10rem) {.rule{width:1rem}}')
    })
  })
})
