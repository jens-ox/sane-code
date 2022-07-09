import { PreValidatePropertyFunction, Validator } from 'jsonschema'
import { Level, Message, ValidatorMethod } from '../types'

import jscpdSchema from '../schemas/jscpd.json'
import packageJsonSchema from '../schemas/package.json'
import eslintSchema from '../schemas/eslint.json'
import avaSchema from '../schemas/ava.json'
import semanticReleaseSchema from '../schemas/semanticRelease.json'
import prettierSchema from '../schemas/prettier.json'
import tsconfigSchema from '../schemas/tsconfigJson.json'
import workflowSchema from '../schemas/githubWorkflow.json'
import stylelintSchema from '../schemas/stylelint.json'

const makePreValidator =
  (feedback: (message: Message) => void): PreValidatePropertyFunction =>
  (object, key, schema) => {
    const value = object[key]
    if (typeof value === 'undefined') return

    // get default value from schema if available
    const defaultValue = (schema as any).default

    // check if value matches default
    if (defaultValue === value)
      feedback({
        level: Level.WARN,
        message: `value of "${key}" matches default (${defaultValue}) and may therefore be removed.`
      })
  }

export const getValidator = async (): Promise<Record<string, ValidatorMethod>> => {
  const v = new Validator()

  v.addSchema(jscpdSchema, 'https://json.schemastore.org/jscpd.json')
  v.addSchema(packageJsonSchema, 'https://json.schemastore.org/package.json')
  v.addSchema(eslintSchema, 'https://json.schemastore.org/eslintrc.json')
  v.addSchema(avaSchema, 'https://json.schemastore.org/ava.json')
  v.addSchema(semanticReleaseSchema, 'https://json.schemastore.org/semantic-release.json')
  v.addSchema(prettierSchema, 'https://json.schemastore.org/prettierrc.json')
  v.addSchema(tsconfigSchema, 'https://json.schemastore.org/tsconfig')
  v.addSchema(workflowSchema, 'https://json.schemastore.org/github-workflow.json')
  v.addSchema(stylelintSchema, 'https://json.schemastore.org/stylelintrc.json')

  const validateSchema = async (data: unknown, schema: string): Promise<Array<Message>> => {
    const unnecessaryDefaults: Array<Message> = []
    const result = v.validate(
      data,
      {
        $ref: schema
      },
      {
        preValidateProperty: makePreValidator((defaultsMessage) => unnecessaryDefaults.push(defaultsMessage))
      }
    )

    return [...result.errors.map((e) => ({ level: Level.ERROR, message: e.stack })), ...unnecessaryDefaults]
  }

  const packageJson: ValidatorMethod = async (data) => validateSchema(data, 'https://json.schemastore.org/package.json')

  const tsconfig: ValidatorMethod = async (data) => validateSchema(data, 'https://json.schemastore.org/tsconfig')

  const eslint: ValidatorMethod = async (data) => validateSchema(data, 'https://json.schemastore.org/eslintrc.json')

  const workflow: ValidatorMethod = async (data) =>
    validateSchema(data, 'https://json.schemastore.org/github-workflow.json')

  return {
    packageJson,
    tsconfig,
    eslint,
    workflow
  }
}
