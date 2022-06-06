import { PreValidatePropertyFunction, Validator } from 'jsonschema'
import axios from 'axios'
import { Level, Message } from '../types'

let validator: Validator

const makePreValidator =
  (feedback: (message: Message) => void): PreValidatePropertyFunction =>
  (object, key, schema) => {
    const value = object[key]
    if (typeof value === 'undefined') return

    // get default value from schema
    const defaultValue = (schema as any).default

    // check if value matches default
    if (defaultValue === value)
      feedback({
        level: Level.WARN,
        message: `value of "${key}" matches default (${defaultValue}) and may therefore be removed.`
      })
  }

const getValidator = async () => {
  if (validator) return validator

  const v = new Validator()

  const [
    { data: packageJsonSchema },
    { data: eslintSchema },
    { data: avaSchema },
    { data: semanticReleaseSchema },
    { data: prettierSchema },
    { data: tsconfigSchema }
  ] = await Promise.all([
    axios.get('https://json.schemastore.org/package.json'),
    axios.get('https://json.schemastore.org/eslintrc.json'),
    axios.get('https://json.schemastore.org/ava.json'),
    axios.get('https://json.schemastore.org/semantic-release.json'),
    axios.get('https://json.schemastore.org/prettierrc.json'),
    axios.get('https://json.schemastore.org/tsconfig')
  ])

  v.addSchema(packageJsonSchema, 'https://json.schemastore.org/package.json')
  v.addSchema(eslintSchema, 'https://json.schemastore.org/eslintrc.json')
  v.addSchema(avaSchema, 'https://json.schemastore.org/ava.json')
  v.addSchema(semanticReleaseSchema, 'https://json.schemastore.org/semantic-release.json')
  v.addSchema(prettierSchema, 'https://json.schemastore.org/prettierrc.json')
  v.addSchema(tsconfigSchema, 'https://json.schemastore.org/tsconfig')
  validator = v
  return v
}

export const validatePackageJson = async (data: unknown): Promise<Array<Message>> => {
  const v = await getValidator()
  const result = v.validate(data, {
    $ref: 'https://json.schemastore.org/package.json'
  })

  return result.errors.map((e) => ({ level: Level.ERROR, message: e.stack }))
}

export const validateTsconfigJson = async (data: unknown): Promise<Array<Message>> => {
  const v = await getValidator()
  const unnecessaryDefaults: Array<Message> = []
  const result = v.validate(
    data,
    {
      $ref: 'https://json.schemastore.org/tsconfig'
    },
    {
      preValidateProperty: makePreValidator((defaultsMessage) => unnecessaryDefaults.push(defaultsMessage))
    }
  )

  return [...result.errors.map((e) => ({ level: Level.ERROR, message: e.stack })), ...unnecessaryDefaults]
}
