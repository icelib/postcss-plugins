import { tokenizer, TokenType } from '@csstools/css-tokenizer'

// A dimension/percentage token always starts with a CSS number. Tokenization
// determines its boundary; this pattern only recovers the original spelling
// for callback context, including the sign and exponent.
const NUMBER_PREFIX = /^[+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?/i

type ConvertDimension = (match: string, rawValue: string, rawUnit: string, decodedUnit: string) => string

interface BlockFrame {
  closing: TokenType
  start: number
  isVar: boolean
  protected: boolean
}

interface DimensionCandidate {
  start: number
  end: number
  raw: string
  rawValue: string
  rawUnit: string
  decodedUnit: string
}

function createFallbackValueTransformer(convert: ConvertDimension) {
  return (value: string) => {
    const stream = tokenizer({ css: value })
    const blocks: BlockFrame[] = []
    const candidates: DimensionCandidate[] = []
    let protectedDepth = 0

    while (true) {
      const token = stream.nextToken()
      const type = token[0]
      if (type === TokenType.EOF) {
        break
      }

      if (type === TokenType.Function) {
        const name = token[4].value.toLowerCase()
        const protectedBlock = name === 'var' || name === 'url'
        blocks.push({ closing: TokenType.CloseParen, start: token[2], isVar: name === 'var', protected: protectedBlock })
        if (protectedBlock) {
          protectedDepth += 1
        }
      }
      else if (type === TokenType.OpenParen || type === TokenType.OpenSquare || type === TokenType.OpenCurly) {
        const closing = type === TokenType.OpenParen
          ? TokenType.CloseParen
          : type === TokenType.OpenSquare ? TokenType.CloseSquare : TokenType.CloseCurly
        blocks.push({ closing, start: token[2], isVar: false, protected: false })
      }
      else if (type === TokenType.Comma) {
        const block = blocks.at(-1)
        // 只允许直属逗号结束变量名；嵌套函数内部的逗号不属于当前 var。
        if (block?.isVar && block.protected) {
          block.protected = false
          protectedDepth -= 1
        }
      }
      else if (type === blocks.at(-1)?.closing) {
        const block = blocks.pop()!
        if (block.protected) {
          protectedDepth -= 1
        }
      }
      else if (protectedDepth === 0 && (type === TokenType.Dimension || type === TokenType.Percentage)) {
        const rawValue = token[1].match(NUMBER_PREFIX)![0]
        candidates.push({
          start: token[2],
          end: token[3] + 1,
          raw: token[1],
          rawValue,
          rawUnit: token[1].slice(rawValue.length),
          decodedUnit: type === TokenType.Dimension ? token[4].unit : '%',
        })
      }
    }

    // 未闭合 var 连同内部已闭合子函数保持原文，也不调用可能有副作用的转换回调。
    const unclosedVarStart = blocks.find(block => block.isVar)?.start ?? value.length
    let output = ''
    let cursor = 0
    for (const candidate of candidates) {
      if (candidate.start >= unclosedVarStart) {
        break
      }
      output += value.slice(cursor, candidate.start)
      output += convert(candidate.raw, candidate.rawValue, candidate.rawUnit, candidate.decodedUnit)
      cursor = candidate.end
    }
    return output + value.slice(cursor)
  }
}

function createProtectedValueTransformer(convert: ConvertDimension) {
  return (value: string) => {
    const stream = tokenizer({ css: value })
    const skippedBlocks: TokenType[] = []
    let output = ''

    while (true) {
      const token = stream.nextToken()
      const type = token[0]
      if (type === TokenType.EOF) {
        return output
      }

      if (skippedBlocks.length > 0) {
        if (type === TokenType.Function || type === TokenType.OpenParen) {
          skippedBlocks.push(TokenType.CloseParen)
        }
        else if (type === TokenType.OpenSquare) {
          skippedBlocks.push(TokenType.CloseSquare)
        }
        else if (type === TokenType.OpenCurly) {
          skippedBlocks.push(TokenType.CloseCurly)
        }
        else if (type === skippedBlocks.at(-1)) {
          skippedBlocks.pop()
        }
        output += token[1]
        continue
      }

      if (type === TokenType.Function) {
        const name = token[4].value.toLowerCase()
        // 无引号 URL 由原子 token 表示；带引号 URL 使用函数 token。
        // tokenizer 已解码转义与混合大小写函数名。
        if (name === 'var' || name === 'url') {
          skippedBlocks.push(TokenType.CloseParen)
        }
      }

      if (type === TokenType.Dimension || type === TokenType.Percentage) {
        const rawValue = token[1].match(NUMBER_PREFIX)![0]
        const rawUnit = token[1].slice(rawValue.length)
        const decodedUnit = type === TokenType.Dimension ? token[4].unit : '%'
        output += convert(token[1], rawValue, rawUnit, decodedUnit)
      }
      else {
        output += token[1]
      }
    }
  }
}

export function createValueTransformer(convert: ConvertDimension, transformVarFallbacks = false) {
  return transformVarFallbacks
    ? createFallbackValueTransformer(convert)
    : createProtectedValueTransformer(convert)
}
