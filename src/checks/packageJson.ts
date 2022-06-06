/**
 * This checker checks all package.json files it can find in the repo.
 */

import fs from 'fs/promises'
import { validatePackageJson } from '../helpers/validateSchema'
import { Checker, Level, Message } from '../types'
import glob from '../utils/glob'

const analyze = async (content: string): Promise<Array<Message>> => {
  const errors: Array<Message> = []

  // first, make sure that content is valid JSON
  let data
  try {
    data = JSON.parse(content)
  } catch (error) {
    return [
      {
        level: Level.ERROR,
        message: 'Not valid JSON'
      }
    ]
  }

  // validate against package.json schema
  const jsonResult = await validatePackageJson(data)
  errors.push(
    ...jsonResult.errors.map((e) => ({
      level: Level.ERROR,
      message: e.stack
    }))
  )

  // check fields
  if (!data.name || data.name === '')
    errors.push({
      level: Level.WARN,
      message: 'name field not set'
    })
  if (!data.version || data.version === '')
    errors.push({
      level: Level.WARN,
      message: 'version field not set'
    })
  if (!data.author || data.author === '') {
    errors.push({
      level: Level.WARN,
      message: 'no author set'
    })
  }

  // check if name follows the "simple" format of NPM
  const nameIsSimple = !data.name || /^[a-z-_]+$/.test(data.name)
  if (!nameIsSimple) {
    errors.push({
      level: Level.WARN,
      message:
        'The package name contains something else than underscore letters and hyphens/underscores. While this is valid, it is not advised to do so by NPM. See https://docs.npmjs.com/creating-a-package-json-file#packagejson-fields.'
    })
  }

  // check if version is a "simple" semver
  const versionIsSimple = !data.version || /^([1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(data.version)
  if (!versionIsSimple) {
    errors.push({
      level: Level.WARN,
      message:
        'The package version is not a x.y.z (x > 0) semver. While this is valid, it is not advised to do so by NPM. See https://docs.npmjs.com/about-semantic-versioning.'
    })
  }

  // check if @types are installed as dependencies
  const hasTypesInDependencies = Object.keys(data.dependencies).some((key) => key.includes('@types'))
  if (hasTypesInDependencies) {
    errors.push({
      level: Level.WARN,
      message:
        'Some type declaration dependencies are installed as regular dependencies. You can probably move them to devDepdendencies.'
    })
  }

  // check if test command has been set up
  const hasTestScript = Object.keys(data.scripts).includes('test')
  if (!hasTestScript) {
    errors.push({
      level: Level.WARN,
      message: 'No test script set up'
    })
  }

  // check if dependencies are hard-pinned
  const hasHardPinned = Object.values({ ...(data.devDepdendencies ?? {}), ...(data.dependencies ?? {}) }).some((key) =>
    /^[0-9]/.test(key as string)
  )
  if (hasHardPinned) {
    errors.push({
      level: Level.WARN,
      message:
        'Some dependencies are hard-set to a version. This can have several downsides (further reading at https://www.the-guild.dev/blog/how-should-you-pin-dependencies-and-why). Consider allowing automatic non-breaking updates by using specifiers like ^x.y.z.'
    })
  }

  // TODO check if deprecated packages are used
  // TODO check if resolutions are forced
  // TODO run npm-check-updates

  return errors
}

const packageJsonChecker: Checker = async () => {
  const results = (await glob('./**/package.json', {
    ignore: './**/node_modules/**/*'
  })) as Array<string>

  // for each file, analyze
  const errorMatrix = await Promise.all(
    results.map(async (file) => {
      const content = await fs.readFile(file, 'utf-8')
      const errors = await analyze(content)
      return errors.map((error) => ({ ...error, file }))
    })
  )

  // flatten errors
  return errorMatrix.flat()
}

export default packageJsonChecker
