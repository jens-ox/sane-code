/**
 * This checker checks all package.json files it can find in the repo.
 */

import fs from 'fs/promises'
import chalk from 'chalk'
import _glob from 'glob'
import { validatePackageJson } from '../helpers/validateSchema'

const glob = function (pattern: string, options?: _glob.IOptions) {
  return new Promise((resolve, reject) => {
    _glob(pattern, options ?? {}, (err, files) => (err === null ? resolve(files) : reject(err)))
  })
}

const analyze = async (content: string): Promise<Array<string>> => {
  const errors: Array<string> = []

  // first, make sure that content is valid JSON
  let data
  try {
    data = JSON.parse(content)
  } catch (error) {
    return [chalk.red('package.json: not valid JSON')]
  }

  // validate against package.json schema
  const jsonResult = await validatePackageJson(data)
  errors.push(...jsonResult.errors.map((e) => chalk.red(e.stack)))

  // check obligatory fields
  if (!data.name) {
    errors.push(chalk.red('obligatory name field not set'))
  }
  if (!data.version) {
    errors.push(chalk.red('obligatory version field not set'))
  }

  // check if name follows the "simple" format of NPM
  const nameIsSimple = !data.name || /^[a-z-_]+$/.test(data.name)
  if (!nameIsSimple) {
    errors.push(
      chalk.yellow(
        'the package name contains something else than underscore letters and hyphens/underscores. While this is valid, it is not advised to do so by NPM. See https://docs.npmjs.com/creating-a-package-json-file#packagejson-fields.'
      )
    )
  }

  // check if version is a "simple" semver
  const versionIsSimple = !data.version || /^([1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(data.version)
  if (!versionIsSimple) {
    errors.push(
      chalk.yellow(
        'The package version is not a x.y.z (x > 0) semver. While this is valid, it is not advised to do so by NPM. See https://docs.npmjs.com/about-semantic-versioning.'
      )
    )
  }

  return errors
}

const main = async () => {
  const results = (await glob('./**/package.json', {
    ignore: './node_modules/**/*'
  })) as Array<string>

  // for each file, analyze
  console.log(`found ${results.length} package.json files outside node_modules`)

  const errorMatrix = await Promise.all(
    results.map(async (file) => {
      const content = (await fs.readFile(file)).toString()
      return analyze(content)
    })
  )

  // flatten errors
  for (let i = 0; i < results.length; i++) {
    const file = results[i]
    const errors = errorMatrix[i]
    errors.map((error) => console.log(`${file} -- ${error}`))
  }
}

export default main
