import fs from 'fs/promises'
import YAML from 'yaml'
import { Checker, Level, Message } from '../types'
import glob from '../utils/glob'

const lockfileChecker: Checker = async () => {
  const errors: Array<Message> = []
  const npmLockfiles = await glob('./**/package-lock.json', {
    ignore: './node_modules/**/*'
  })
  const yarnLockfiles = await glob('./**/yarn.lock', {
    ignore: './node_modules/**/*'
  })
  const pnpmLockfiles = await glob('./**/pnpm-lock.yaml', {
    ignore: './node_modules/**/*'
  })

  const lockTypeCount = [npmLockfiles.length, yarnLockfiles.length, pnpmLockfiles.length].filter((e) => e > 0).length

  // check if more than one type of lockfile is present
  if (lockTypeCount > 1)
    errors.push({
      level: Level.ERROR,
      message: 'more than one type of lockfile detected!'
    })

  // check if no lockfile is present
  if (lockTypeCount === 0) errors.push({ level: Level.ERROR, message: 'no lockfile found' })

  // check package-lock.json files
  if (npmLockfiles.length > 0) {
    // if more than one npm lockfile exists, suggest monorepo
    if (npmLockfiles.length > 1) {
      errors.push({
        level: Level.WARN,
        message:
          'More than one package-lock.json found. Consider setting up a NPM workspace (see https://docs.npmjs.com/cli/v7/using-npm/workspaces).'
      })
    }

    // parse each file
    for (const lockPath of npmLockfiles) {
      const npmLockfile = await fs.readFile(lockPath, 'utf-8')

      const npmLockfileContent = JSON.parse(npmLockfile)

      const deprecatedPackages = Object.entries(npmLockfileContent.packages)
        .filter(([, content]) => (content as any).deprecated)
        .map(([key]) => key.replace('node_modules/', ''))

      if (deprecatedPackages.length > 0)
        errors.push({
          file: lockPath,
          level: Level.ERROR,
          message: `lockfile contains deprecated packages: ${deprecatedPackages.join(
            ', '
          )}. Use e.g. npm ls to find out why they're installed.`
        })
    }
  }

  // check yarn.lock files
  if (yarnLockfiles.length > 0) {
    // if more than one yarn lockfile exists, suggest monorepo
    if (yarnLockfiles.length > 1) {
      console.log(yarnLockfiles)
      errors.push({
        level: Level.WARN,
        message:
          'More than one yarn.lock found. Consider setting up a Yarn workspace (see https://classic.yarnpkg.com/lang/en/docs/workspaces/).'
      })
    }

    // parse each file
    // TODO yarn.lock doesn't include deprecation notes.
  }

  // check pnpm lockfiles
  if (pnpmLockfiles.length > 0) {
    // if more than one pnpm lockfile exists, suggest monorepo
    if (pnpmLockfiles.length > 1) {
      errors.push({
        level: Level.WARN,
        message:
          'More than one pnpm-lock.yaml found. Consider setting up a PNPM workspace (see https://pnpm.io/workspaces).'
      })
    }

    // parse each file
    for (const lockPath of pnpmLockfiles) {
      const pnpmLockfile = await fs.readFile(lockPath, 'utf-8')
      const pnpmLockfileContent = YAML.parse(pnpmLockfile)

      const deprecatedPackages = Object.entries(pnpmLockfileContent.packages)
        .filter(([, content]) => (content as any).deprecated)
        .map(([key]) => key.substring(1).replace('/', '@'))

      if (deprecatedPackages.length > 0)
        errors.push({
          file: lockPath,
          level: Level.ERROR,
          message: `lockfile contains deprecated packages: ${deprecatedPackages.join(
            ', '
          )}. Use e.g. pnpm ls to find out why they're installed.`
        })
    }
  }

  return errors
}

export default lockfileChecker
