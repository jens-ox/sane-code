import fs from 'fs/promises'
import chalk from 'chalk'

const fileExists = async (path: string): Promise<boolean> =>
  new Promise((resolve) => {
    fs.access(path)
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })

const lockfileChecker = async () => {
  const hasNpmLockfile = await fileExists('./package-lock.json')
  const hasYarnLockfile = await fileExists('./yarn.lock')
  const hasPnpmLockfile = await fileExists('./pnpm-lock.yaml')

  if ([hasNpmLockfile, hasYarnLockfile, hasPnpmLockfile].filter((e) => e).length > 1)
    console.log(chalk.red('more than one type of lockfile detected!'))
}

export default lockfileChecker
