import fs from 'fs/promises'
import json5 from 'json5'
import { Checker, Level, Message, ValidatorMethod } from '../types'
import glob from '../utils/glob'

const analyze = async (content: string, validator: Record<string, ValidatorMethod>): Promise<Array<Message>> => {
  const errors: Array<Message> = []

  // first, make sure that content is valid JSON
  let data
  try {
    data = json5.parse(content)
  } catch (error) {
    return [
      {
        level: Level.ERROR,
        message: 'Not valid JSON'
      }
    ]
  }

  // validate against tsconfig.json schema
  const jsonResult = await validator.tsconfig(data)
  errors.push(...jsonResult)

  // check for recommended tsconfig fields
  if (typeof data.compilerOptions.exactOptionalPropertyTypes === 'undefined')
    errors.push({
      level: Level.WARN,
      message: 'compilerOptions.exactOptionalPropertyTypes is not set, which is recommended.'
    })
  if (typeof data.compilerOptions.strict === 'undefined')
    errors.push({ level: Level.WARN, message: 'compilerOptions.strict is not set, which is recommended.' })
  if (typeof data.compilerOptions.esModuleInterop === 'undefined')
    errors.push({ level: Level.WARN, message: 'compilerOptions.esModuleInterop is not set, which is recommended.' })
  if (typeof data.compilerOptions.forceConsistentCasingInFileNames === 'undefined')
    errors.push({
      level: Level.WARN,
      message: 'compilerOptions.forceConsistentCasingInFileNames is not set, which is recommended.'
    })
  if (typeof data.compilerOptions.skipLibCheck === 'undefined')
    errors.push({ level: Level.WARN, message: 'compilerOptions.skipLibCheck is not set, which is recommended.' })

  return errors
}

const tsconfigChecker: Checker = async (validator) => {
  const errors: Array<Message> = []
  const tsconfigFiles = await glob('./**/tsconfig.json', { ignore: './**/node_modules/**/*' })

  // if no tsconfig was found, suggest using TypeScript
  if (tsconfigFiles.length === 0) {
    errors.push({
      level: Level.INFO,
      message: 'No tsconfig.json found. Maybe give TypeScript a try :) https://www.typescriptlang.org/'
    })
  }

  // for each file, analyze
  const errorMatrix = await Promise.all(
    tsconfigFiles.map(async (file) => {
      const content = await fs.readFile(file, 'utf-8')
      const errors = await analyze(content, validator)
      return errors.map((error) => ({ ...error, file }))
    })
  )

  return [...errors, ...errorMatrix.flat()]
}

export default tsconfigChecker
