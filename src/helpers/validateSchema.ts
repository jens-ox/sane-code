import { Validator } from 'jsonschema'
import axios from 'axios'

let validator: Validator

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

export const validatePackageJson = async (data: unknown) => {
  const v = await getValidator()
  return v.validate(data, {
    $ref: 'https://json.schemastore.org/package.json'
  })
}

export const validateTsconfigJson = async (data: unknown) => {
  const v = await getValidator()
  return v.validate(data, {
    $ref: 'https://json.schemastore.org/tsconfig'
  })
}
