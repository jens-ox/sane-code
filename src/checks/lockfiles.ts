import fs from 'fs/promises'
import { Checker, Level, Message } from '../types'

const fileExists = async (path: string): Promise<boolean> =>
  new Promise((resolve) => {
    fs.access(path)
      .then(() => resolve(true))
      .catch(() => resolve(false))
  })

const lockfileChecker: Checker = async () => {
  const errors: Array<Message> = []
  const hasNpmLockfile = await fileExists('./package-lock.json')
  const hasYarnLockfile = await fileExists('./yarn.lock')
  const hasPnpmLockfile = await fileExists('./pnpm-lock.yaml')

  if ([hasNpmLockfile, hasYarnLockfile, hasPnpmLockfile].filter((e) => e).length > 1)
    errors.push({
      level: Level.ERROR,
      message: 'more than one type of lockfile detected!'
    })

  return errors
}

export default lockfileChecker
