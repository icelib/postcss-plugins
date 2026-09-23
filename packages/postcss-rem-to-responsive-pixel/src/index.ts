import type { Root } from 'postcss'
import type { PostcssRemToResponsivePixel, UserDefinedOptions } from './types'
import unitConverter, { presets } from 'postcss-rule-unit-converter'
import { getConfig, postcssPlugin } from './shared'

export * from './types'
/**
 * Convert rem to responsive pixels (px or rpx).
 *
 * Defaults:
 * - rootValue: 16
 * - unitPrecision: 5
 * - propList: ['font', 'font-size', 'line-height', 'letter-spacing']
 * - replace: true
 * - mediaQuery: false
 * - minRemValue: 0
 * - exclude: [/node_modules/i]
 * - transformUnit: 'px'
 * - processorStage: 'Once'
 * - disabled: false
 *
 * @example
 * import postcss from 'postcss'
 * import remToResponsivePixel from 'postcss-rem-to-responsive-pixel'
 *
 * const result = await postcss([remToResponsivePixel({
 *   transformUnit: 'rpx',
 *   rootValue: 16,
 * })]).process('.a{font-size:1rem}', { from: undefined })
 */
const plugin: PostcssRemToResponsivePixel = (
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
    processorStage,
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
      transformUnit === 'rpx'
        ? presets.remToRpx({
            rootValue,
          })
        : presets.remToPx({
            rootValue,
          }),
    ],
    selectorBlackList,
    unitPrecision,
  }) as { Once?: (css: Root) => void }

  return {
    postcssPlugin,
    [processorStage]: (css: Root) => {
      wrappedPlugin.Once?.(css)
    },
  }
}

plugin.postcss = true

export default plugin
