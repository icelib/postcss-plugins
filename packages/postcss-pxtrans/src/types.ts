/* c8 ignore file */
import type { Input } from 'postcss'

/**
 * Supported transformation method types.
 *
 * @example
 * const methods: PxTransformMethod[] = ['platform', 'size']
 */
export type PxTransformMethod = 'platform' | 'size'

/**
 * Supported target platforms.
 *
 * @example
 * const platform: PxTransformPlatform = 'weapp'
 */
export type PxTransformPlatform = 'weapp' | 'h5' | 'rn' | 'quickapp' | 'harmony'

/**
 * Target unit after conversion.
 *
 * @example
 * const unit: PxTransformTargetUnit = 'rpx'
 */
export type PxTransformTargetUnit = 'rpx' | 'rem' | 'px' | 'vw' | 'vmin'

/**
 * Design width can be a number or per-file resolver.
 *
 * @default 750
 * @example
 * const designWidth: DesignWidth = (input) =>
 *   input.file?.includes('tablet') ? 1024 : 750
 */
export type DesignWidth
  = number
    | ((input: Input) => number)

/**
 * Device ratio mapping for different design widths.
 *
 * @example
 * const deviceRatio: PxTransformDeviceRatio = { 750: 1, 375: 2 }
 */
export interface PxTransformDeviceRatio {
  [designWidth: number]: number
}

/**
 * Options for postcss-pxtrans.
 *
 * Defaults:
 * - platform: 'weapp'
 * - designWidth: 750
 * - deviceRatio: { 375: 2, 640: 1.17, 750: 1, 828: 0.905 }
 * - methods: ['platform', 'size']
 * - rootValue: computed from platform + designWidth
 * - targetUnit: 'rpx' (weapp), 'rem' (h5)
 * - unitPrecision: 5
 * - selectorBlackList: []
 * - propList: ['*']
 * - replace: true
 * - mediaQuery: false
 * - minPixelValue: 0
 * - onePxTransform: true
 *
 * @example
 * const options: PxTransformOptions = {
 *   platform: 'h5',
 *   designWidth: 375,
 *   targetUnit: 'vw',
 *   propList: ['*'],
 * }
 */
export interface PxTransformOptions {
  /**
   * Target platform.
   *
   * @default 'weapp'
   */
  platform?: PxTransformPlatform
  /**
   * Design width in pixels.
   *
   * @default 750
   */
  designWidth?: DesignWidth
  /**
   * Target unit after conversion.
   *
   * @default 'rpx' (weapp), 'rem' (h5)
   */
  targetUnit?: PxTransformTargetUnit
  /**
   * Device ratio map.
   *
   * @default { 375: 2, 640: 1.17, 750: 1, 828: 0.905 }
   */
  deviceRatio?: PxTransformDeviceRatio

  /**
   * Custom root value resolver.
   *
   * @default computed from platform + designWidth
   */
  rootValue?: number | ((input: Input, m: string, value: string) => number)
  /**
   * Base font size for rem conversion.
   *
   * @default 20 (or minRootSize when >= 1)
   */
  baseFontSize?: number
  /**
   * Minimum base font size.
   *
   * @default 0
   */
  minRootSize?: number

  /**
   * Enabled methods.
   *
   * @default ['platform', 'size']
   */
  methods?: readonly PxTransformMethod[]
  /**
   * Decimal precision for generated values.
   *
   * @default 5
   */
  unitPrecision?: number
  /**
   * Selectors to ignore.
   *
   * @default []
   */
  selectorBlackList?: readonly (string | RegExp)[]
  /**
   * Properties to transform.
   * Supports negated glob patterns like `!padding*` or `!--wot-*-font-size`.
   *
   * @default ['*']
   */
  propList?: readonly string[]
  /**
   * Replace the original declaration value.
   *
   * @default true
   */
  replace?: boolean
  /**
   * Enable unit conversion inside @media params.
   *
   * @default false
   */
  mediaQuery?: boolean
  /**
   * Minimum px value to convert.
   *
   * @default 0
   */
  minPixelValue?: number
  /**
   * Convert 1px values.
   *
   * @default true
   */
  onePxTransform?: boolean
  /**
   * Exclude files by path.
   *
   * @default undefined
   */
  exclude?: readonly (string | RegExp)[] | ((filePath?: string) => boolean)

  /** @deprecated Use `rootValue`. */
  root_value?: PxTransformOptions['rootValue']
  /** @deprecated Use `unitPrecision`. */
  unit_precision?: PxTransformOptions['unitPrecision']
  /** @deprecated Use `selectorBlackList`. */
  selector_black_list?: PxTransformOptions['selectorBlackList']
  /** @deprecated Use `propList`. */
  prop_list?: PxTransformOptions['propList']
  /** @deprecated Use `mediaQuery`. */
  media_query?: PxTransformOptions['mediaQuery']
  /** @deprecated Use `minPixelValue`. */
  min_pixel_value?: PxTransformOptions['minPixelValue']
  /** @deprecated Use `onePxTransform`. */
  one_px_transform?: PxTransformOptions['onePxTransform']
  /** @deprecated Use `baseFontSize`. */
  base_font_size?: PxTransformOptions['baseFontSize']
  /** @deprecated Use `minRootSize`. */
  min_root_size?: PxTransformOptions['minRootSize']
  /** @deprecated Use `targetUnit`. */
  target_unit?: PxTransformOptions['targetUnit']
  /** @deprecated Use `designWidth`. */
  design_width?: PxTransformOptions['designWidth']
  /** @deprecated Use `deviceRatio`. */
  device_ratio?: PxTransformOptions['deviceRatio']

}
