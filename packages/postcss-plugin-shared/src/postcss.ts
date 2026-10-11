import type {
  AtRule,
  ChildNode,
  Declaration,
  Input,
  Root,
  Rule,
} from 'postcss'
import {
  createExcludeMatcher,
  createPropListMatcher,
  createSelectorBlacklistMatcher,
} from './selectors'

/**
 * Check whether a declaration with the same property and value already exists.
 * When supplied, `important` also requires the same importance flag.
 *
 * @example
 * if (declarationExists(rule, 'margin', '16px')) return
 */
export function declarationExists(
  decls: { some: (cb: (node: ChildNode) => boolean) => boolean },
  prop: string,
  value: string,
  important?: boolean,
) {
  const nodes = decls as unknown as { length?: number, [index: number]: ChildNode }
  const length = nodes.length

  if (typeof length === 'number') {
    for (let index = 0; index < length; index += 1) {
      const node = nodes[index]
      if (node?.type !== 'decl') {
        continue
      }

      const decl = node as Declaration
      if (decl.prop === prop && decl.value === value
        && (important === undefined || Boolean(decl.important) === important)) {
        return true
      }
    }

    return false
  }

  return decls.some((node) => {
    if (node.type !== 'decl') {
      return false
    }
    const decl = node as Declaration
    return decl.prop === prop && decl.value === value
      && (important === undefined || Boolean(decl.important) === important)
  })
}

/**
 * Context passed to value replacers during traversal.
 *
 * @example
 * const replacer = (context: ReplaceContext) => (m) => m
 */
export interface ReplaceContext {
  root: Root
  input: Input
  filePath?: string
  decl?: Declaration
  rule?: Rule
  atRule?: AtRule
  prop?: string
  selector?: string
}

/**
 * Options for walking declarations and replacing unit values.
 *
 * Defaults:
 * - selectorBlackList: []
 * - exclude: []
 * - replace: true
 * - skipDuplicate: true
 * - mediaQuery: false
 *
 * @example
 * walkAndReplaceValues({
 *   root,
 *   unitRegex: /\\d+px/g,
 *   propList: ['*'],
 *   createReplacer: () => (m) => m,
 * })
 */
export interface WalkAndReplaceOptions {
  root: Root
  /** Context for source-less ASTs. Existing root.source.input takes precedence. */
  input?: Input
  /** Required with createReplacer unless createValueTransformer is supplied. */
  unitRegex?: RegExp
  propList: readonly (string | RegExp)[]
  selectorBlackList?: readonly (string | RegExp)[]
  exclude?: readonly (string | RegExp)[] | ((filePath: string) => boolean)
  replace?: boolean
  /** 仅在 replace:false 时跳过已存在的转换结果；替换模式始终更新当前声明。 */
  skipDuplicate?: boolean
  mediaQuery?: boolean
  /** Required with unitRegex unless createValueTransformer is supplied. */
  createReplacer?: (context: ReplaceContext) => (m: string, $1?: string) => string
  /** Transforms the complete value, taking precedence over the regex strategy. */
  createValueTransformer?: (context: ReplaceContext) => (value: string) => string
  shouldProcessDecl?: (decl: Declaration) => boolean
  shouldProcessAtRule?: (atRule: AtRule) => boolean
}

interface DeclarationContainer {
  nodes?: readonly ChildNode[]
}

interface DeclarationIndex {
  counts: Map<string, number>
}

function declarationKey(prop: string, value: string, important: boolean | undefined) {
  return `${prop}\0${value}\0${important ? '1' : '0'}`
}

function createDeclarationIndex(container: DeclarationContainer): DeclarationIndex {
  const counts = new Map<string, number>()
  for (const node of container.nodes ?? []) {
    if (node.type !== 'decl') {
      continue
    }
    const key = declarationKey(node.prop, node.value, node.important)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return { counts }
}

function incrementDeclaration(index: DeclarationIndex, prop: string, value: string, important: boolean | undefined) {
  const key = declarationKey(prop, value, important)
  index.counts.set(key, (index.counts.get(key) ?? 0) + 1)
}

function decrementDeclaration(index: DeclarationIndex, prop: string, value: string, important: boolean | undefined) {
  const key = declarationKey(prop, value, important)
  const count = index.counts.get(key) ?? 0
  if (count <= 1) {
    index.counts.delete(key)
  }
  else {
    index.counts.set(key, count - 1)
  }
}

function hasDeclaration(index: DeclarationIndex, prop: string, value: string, important: boolean | undefined) {
  return (index.counts.get(declarationKey(prop, value, important)) ?? 0) > 0
}

function createGlobalRegex(regex: RegExp) {
  // `String#replace` only visits one match when a custom regex omits `g`.
  // Sticky matching is also unsuitable here because a declaration can contain
  // units at arbitrary offsets. Normalize both cases once per walk.
  const flags = `${regex.flags.replace(/[gy]/g, '')}g`
  return regex.global && !regex.sticky
    ? regex
    : new RegExp(regex.source, flags)
}

/**
 * Walk declarations and @media params, replacing unit values with a custom replacer.
 *
 * @example
 * walkAndReplaceValues({
 *   root,
 *   unitRegex: /\\d+rem/g,
 *   propList: ['*'],
 *   createReplacer: () => (m) => m.replace('rem', 'px'),
 * })
 */
export function walkAndReplaceValues(options: WalkAndReplaceOptions) {
  const {
    root,
    unitRegex,
    propList,
    selectorBlackList = [],
    exclude = [],
    replace = true,
    skipDuplicate = true,
    mediaQuery = false,
    createReplacer,
    createValueTransformer,
    shouldProcessDecl,
    shouldProcessAtRule,
  } = options

  let hasCandidate: (value: string) => boolean
  let transformValue: (value: string, context: ReplaceContext) => string
  if (createValueTransformer) {
    hasCandidate = () => true
    transformValue = (value, context) => createValueTransformer(context)(value)
  }
  else {
    if (!unitRegex || !createReplacer) {
      throw new TypeError('walkAndReplaceValues requires createValueTransformer or both unitRegex and createReplacer')
    }
    const replacementRegex = createGlobalRegex(unitRegex)
    const unitTestRegex = new RegExp(unitRegex.source, unitRegex.flags.replace(/[gy]/g, ''))
    hasCandidate = value => unitTestRegex.test(value)
    transformValue = (value, context) => value.replace(replacementRegex, createReplacer(context))
  }

  const source = root.source
  const input = source?.input ?? options.input
  if (!input) {
    return
  }

  const filePath = input.file as string | undefined
  const excludeFn = createExcludeMatcher(exclude)
  if (filePath && excludeFn(filePath)) {
    return
  }

  const satisfyPropList = createPropListMatcher(propList)
  const hasSelectorBlackList = selectorBlackList.length > 0
  const isBlacklisted = hasSelectorBlackList
    ? createSelectorBlacklistMatcher(selectorBlackList, { cache: true })
    : undefined
  const baseContext: ReplaceContext = {
    root,
    input,
    ...(filePath === undefined ? {} : { filePath }),
  }

  const shouldProcess = shouldProcessAtRule ?? ((atRule: AtRule) => atRule.name === 'media')
  const declarationIndexes = skipDuplicate
    ? new WeakMap<object, DeclarationIndex>()
    : undefined
  const generatedDeclarations = new WeakSet<Declaration>()

  const getDeclarationIndex = (container: DeclarationContainer) => {
    if (!declarationIndexes) {
      return undefined
    }
    const key = container as object
    const existing = declarationIndexes.get(key)
    if (existing) {
      return existing
    }
    const created = createDeclarationIndex(container)
    declarationIndexes.set(key, created)
    return created
  }

  // Use a single tree walk for declarations and at-rule params. Apart from
  // avoiding a second traversal, this lets us skip fallback declarations that
  // are inserted during the walk. Without the guard, replace=false can process
  // its own clone again and create an unbounded chain for same-unit or
  // bidirectional conversion rules.
  root.walk((node) => {
    if (node.type === 'decl') {
      const decl = node as Declaration
      if (generatedDeclarations.has(decl)) {
        return
      }
      if (!satisfyPropList(decl.prop)) {
        return
      }
      if (shouldProcessDecl && !shouldProcessDecl(decl)) {
        return
      }
      if (!hasCandidate(decl.value)) {
        return
      }

      const parent = decl.parent as (DeclarationContainer & { type?: string }) | undefined
      const rule = parent?.type === 'rule' ? parent as unknown as Rule : undefined
      if (hasSelectorBlackList && rule && isBlacklisted?.(rule)) {
        return
      }

      const atRule = parent?.type === 'atrule'
        ? parent as unknown as AtRule
        : rule?.parent?.type === 'atrule'
          ? rule.parent as AtRule
          : undefined
      const context: ReplaceContext = {
        ...baseContext,
        decl,
        ...(rule ? { rule, selector: rule.selector } : {}),
        prop: decl.prop,
        ...(atRule ? { atRule } : {}),
      }
      const nextValue = transformValue(decl.value, context)
      if (nextValue === decl.value) {
        return
      }

      const index = getDeclarationIndex(parent ?? root)
      if (!replace && skipDuplicate && index && hasDeclaration(index, decl.prop, nextValue, decl.important)) {
        return
      }

      if (replace) {
        if (index) {
          decrementDeclaration(index, decl.prop, decl.value, decl.important)
          incrementDeclaration(index, decl.prop, nextValue, decl.important)
        }
        decl.value = nextValue
        return
      }

      if (index) {
        incrementDeclaration(index, decl.prop, nextValue, decl.important)
      }
      const clone = decl.cloneAfter({ value: nextValue })
      generatedDeclarations.add(clone)
      return
    }

    if (mediaQuery && node.type === 'atrule') {
      const atRule = node as AtRule
      if (!shouldProcess(atRule) || !hasCandidate(atRule.params)) {
        return
      }
      const context: ReplaceContext = {
        ...baseContext,
        atRule,
      }
      const nextParams = transformValue(atRule.params, context)
      if (nextParams !== atRule.params) {
        atRule.params = nextParams
      }
    }
  })
}
