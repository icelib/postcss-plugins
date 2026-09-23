import type { PostcssRemToViewport, UserDefinedOptions } from './types'
import unitConverter, { presets } from 'postcss-rule-unit-converter'
import { getConfig, postcssPlugin } from './shared'

/**
 * Convert rem to viewport units (vw by default).
 *
 * Defaults:
 * - rootValue: 375
 * - unitPrecision: 16
 * - propList: ['font', 'font-size', 'line-height', 'letter-spacing']
 * - replace: true
 * - mediaQuery: false
 * - minRemValue: 0
 * - exclude: [/node_modules/i]
 * - transformUnit: 'vw'
 * - disabled: false
 *
 * @example
 * import postcss from 'postcss'
 * import remToViewport from 'postcss-rem-to-viewport'
 *
 * const result = await postcss([remToViewport({
 *   rootValue: 375,
 *   transformUnit: 'vw',
 * })]).process('.a{font-size:1rem}', { from: undefined })
 */
const plugin: PostcssRemToViewport = (
  options: UserDefinedOptions = {},
) => {
  const {
    exclude,
    mediaQuery,
    minRemValue,
    propList,
    replace,
    rootValue,
    selectorBlackList,
    transformUnit,
    unitPrecision,
    disabled,
  } = getConfig(options)
  if (disabled) {
    return {
      postcssPlugin,
    }
  }

  const wrappedPlugin = unitConverter({
    disabled,
    exclude,
    mediaQuery,
    minValue: minRemValue,
    propList,
    replace,
    rules: [
      presets.remToViewport({
        rootValue: 16,
        to: transformUnit,
        viewportWidth: rootValue,
      }),
    ],
    selectorBlackList,
    unitPrecision,
  }) as { Once?: (css: unknown) => void }

  return {
    postcssPlugin,
    Once(css) {
      wrappedPlugin.Once?.(css)
    },
  }
}

plugin.postcss = true

export default plugin
