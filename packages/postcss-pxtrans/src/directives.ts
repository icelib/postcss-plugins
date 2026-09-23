import type { Comment, Result } from 'postcss'
import type { PxTransformMethod, PxTransformOptions, PxTransformPlatform } from './types'

const postcssPlugin = 'postcss-pxtrans-directives'

interface DirectiveState {
  skip: boolean
}

function normalizeCommentText(text: string) {
  return text.trim().replace(/\s+/g, ' ')
}

function isConditionalDirective(text: string) {
  return /#(?:if|ifdef|ifndef)\b/.test(text)
}

function removeUntilEndif(comment: Comment) {
  let depth = 0
  let next = comment.next()
  while (next) {
    if (next.type === 'comment') {
      const text = normalizeCommentText(next.text)
      if (isConditionalDirective(text)) {
        depth += 1
      }
      else if (text === '#endif') {
        if (depth === 0) {
          break
        }
        depth -= 1
      }
    }
    const temp = next.next()
    next.remove()
    next = temp
  }
}

function handleIfdef(comment: Comment, platform: PxTransformPlatform) {
  const wordList = normalizeCommentText(comment.text).split(' ')
  if (!wordList.includes('#ifdef')) {
    return
  }
  if (wordList.includes(platform)) {
    return
  }
  removeUntilEndif(comment)
}

function handleIfndef(comment: Comment, platform: PxTransformPlatform) {
  const wordList = normalizeCommentText(comment.text).split(' ')
  if (!wordList.includes('#ifndef')) {
    return
  }
  if (!wordList.includes(platform)) {
    return
  }
  removeUntilEndif(comment)
}

function handleRnEject(comment: Comment) {
  if (normalizeCommentText(comment.text) !== 'postcss-pxtrans rn eject enable') {
    return
  }
  let next = comment.next()
  while (next) {
    if (next.type === 'comment' && normalizeCommentText(next.text) === 'postcss-pxtrans rn eject disable') {
      break
    }
    const temp = next.next()
    next.remove()
    next = temp
  }
}

/**
 * Create a PostCSS plugin that handles pxtrans directives such as
 * `#ifdef`, `#ifndef`, and `postcss-pxtrans rn eject`.
 *
 * Defaults:
 * - platform: 'weapp'
 * - methods: ['platform', 'size']
 *
 * @example
 * import postcss from 'postcss'
 * import pxtrans, { createDirectivePlugin } from 'postcss-pxtrans'
 *
 * const result = await postcss([
 *   createDirectivePlugin({ platform: 'rn' }),
 *   pxtrans({ platform: 'rn' }),
 * ]).process('/* #ifdef rn *\\/\\n.a{width:16px}\\n/* #endif *\\/', { from: undefined })
 */
export function createDirectivePlugin(options: PxTransformOptions = {}) {
  const methods: readonly PxTransformMethod[] = options.methods ?? ['platform', 'size']
  const platform: PxTransformPlatform = options.platform ?? 'weapp'

  const plugin = {
    postcssPlugin,
    prepare(result: Result) {
      const state: DirectiveState = { skip: false }
      const root = result.root

      return {
        Comment(comment: Comment) {
          if (normalizeCommentText(comment.text) === 'postcss-pxtrans disable') {
            state.skip = true
            root.raws.__pxtransSkip = true
            return
          }

          if (!methods.includes('platform')) {
            return
          }

          if (platform === 'rn') {
            handleRnEject(comment)
          }

          handleIfdef(comment, platform)
          handleIfndef(comment, platform)
        },
        OnceExit() {
          if (state.skip && root) {
            root.raws.__pxtransSkip = true
          }
        },
      }
    },
  }

  return plugin
}

export default createDirectivePlugin
