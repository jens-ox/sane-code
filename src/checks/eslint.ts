import fs from 'fs/promises'
import { join } from 'path'
import json5 from 'json5'
import YAML from 'yaml'
import { validateEslint } from '../helpers/validateSchema'
import { Checker, Level, Message } from '../types'
import glob from '../utils/glob'

const eslintChecker: Checker = async () => {
  const errors: Array<Message> = []

  // load all package.json files
  const packageJsonFiles = await glob('./**/package.json', {
    ignore: './**/node_modules/**/*'
  })

  // load all possible eslint config files
  const eslintConfigFiles = await glob('./**/.eslintrc.*', {
    ignore: './**/node_modules/**/*'
  })

  // assumption: there should be at most as many eslint config files as package.json files without inline eslintConfig
  const packageJsonWithEslintConfig = (
    await Promise.all(
      packageJsonFiles
        .map(async (path) => {
          const contentString = await fs.readFile(path, 'utf-8')
          let content
          try {
            content = json5.parse(contentString)
          } catch (error) {
            throw new Error(`${path}: no valid JSON`)
          }
          return typeof content.eslintConfig !== 'undefined'
        })
        .filter((e) => e)
    )
  ).filter((e) => e).length

  const packageJsonWithoutEslintConfig = packageJsonFiles.length - packageJsonWithEslintConfig

  // if there's no package.json with eslintConfig and no eslint config file
  if (packageJsonWithEslintConfig === 0 && eslintConfigFiles.length === 0)
    errors.push({
      level: Level.WARN,
      message: 'no package.json with eslintConfig and no eslint config file found. Consider setting up ESLint.'
    })

  // if there's more eslint config files than package.json files without eslintConfig
  if (eslintConfigFiles.length > packageJsonWithoutEslintConfig)
    errors.push({
      level: Level.WARN,
      message:
        'More eslint config files than package.json files without eslintConfig found. ESLint will ignore sibling config files.'
    })

  // validate eslint files against eslint json schema
  const eslintConfigValidationErrors = await Promise.all(
    eslintConfigFiles.map(async (path) => {
      // if file is (c)js, try to import it
      let data
      if (/.*\.c?js/.test(path)) data = require(join(process.cwd(), path))
      else if (path.endsWith('json')) {
        // read path content
        const content = await fs.readFile(path, 'utf-8')

        // try to read it as JSON
        try {
          data = json5.parse(content)
        } catch (error) {
          errors.push({
            level: Level.ERROR,
            message: 'File is not valid JSON',
            file: path
          })
        }
      } else {
        // try to parse it as YAML
        const content = await fs.readFile(path, 'utf-8')

        try {
          data = YAML.parse(content)
        } catch (error) {
          errors.push({
            level: Level.ERROR,
            message: 'Was not able to parse eslint config file (not valid YAML).',
            file: path
          })
        }
      }

      // validate content against eslint schema
      const jsonErrors = await validateEslint(data)
      return jsonErrors.map((e) => ({ ...e, file: path }))
    })
  )

  // TODO check that one lint config has prettier set up

  return [...errors, ...eslintConfigValidationErrors.flat()]
}

export default eslintChecker
