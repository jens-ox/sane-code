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

  // check fields
  if (!data.name) errors.push(chalk.yellow('name field not set'))
  if (!data.version) errors.push(chalk.yellow('version field not set'))

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

  // check if @types are installed as dependencies
  const hasTypesInDependencies = Object.keys(data.dependencies).some((key) => key.includes('@types'))
  if (hasTypesInDependencies) {
    errors.push(
      chalk.yellow(
        'Some type declaration dependencies are installed as regular dependencies. You can probably move them to devDepdendencies.'
      )
    )
  }

  // check if test command has been set up
  const hasTestScript = Object.keys(data.scripts).includes('test')
  if (!hasTestScript) {
    errors.push(chalk.yellow('No test script set up'))
  }

  // check if dependencies are hard-pinned
  const hasHardPinned = Object.values({ ...(data.devDepdendencies ?? {}), ...(data.dependencies ?? {}) }).some((key) =>
    /^[0-9]/.test(key as string)
  )
  if (hasHardPinned) {
    errors.push(
      chalk.yellow(
        'Some dependencies are hard-set to a version. This can have several downsides (further reading at https://www.the-guild.dev/blog/how-should-you-pin-dependencies-and-why). Consider allowing automatic non-breaking updates by using specifiers like ^x.y.z.'
      )
    )
  }

  // TODO check if deprecated packages are used
  // TODO check if resolutions are forced
  // TODO run npm-check-updates

  return errors
}

const packageJsonChecker = async () => {
  const results = (await glob('./**/package.json', {
    ignore: './node_modules/**/*'
  })) as Array<string>

  // for each file, analyze
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

export default packageJsonChecker
