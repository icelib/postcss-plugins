import { tokenizer, TokenType } from '@csstools/css-tokenizer'

// A dimension/percentage token always starts with a CSS number. Tokenization
// determines its boundary; this pattern only recovers the original spelling
// for callback context, including the sign and exponent.
const NUMBER_PREFIX = /^[+-]?(?:\d*\.\d+|\d+)(?:e[+-]?\d+)?/i

type ConvertDimension = (match: string, rawValue: string, rawUnit: string, decodedUnit: string) => string

export function createValueTransformer(convert: ConvertDimension) {
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
        // Unquoted URLs are atomic URL/BadURL tokens; quoted URLs are function
        // tokens. Escaped and mixed-case spellings have already been decoded.
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
