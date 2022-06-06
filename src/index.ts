import chalk from 'chalk'
import eslintChecker from './checks/eslint'
import lockfileChecker from './checks/lockfiles'
import packageJsonChecker from './checks/packageJson'
import tsconfigChecker from './checks/tsconfig'
import { Level, Message } from './types'

const printMessage = (message: Message): string => {
  switch (message.level) {
    case Level.ERROR:
      return chalk.red(message.message)
    case Level.WARN:
      return chalk.yellow(message.message)
    default:
      return message.message
  }
}

export async function main() {
  const problems = [
    ...(await packageJsonChecker()),
    ...(await lockfileChecker()),
    ...(await tsconfigChecker()),
    ...(await eslintChecker())
  ]

  // group problems by file
  const groupedProblems: Record<string, Array<Message>> = problems.reduce(
    (acc, problem) => {
      const key = problem.file ?? 'no-file'
      acc[key] = acc[key] ? [...acc[key], problem] : [problem]
      return acc
    },
    { 'no-file': [] }
  )

  // echo problems
  for (const [file, errors] of Object.entries(groupedProblems)) {
    if (errors.length === 0) continue
    console.log(chalk.bold(file === 'no-file' ? 'General' : file))
    for (const error of errors) {
      console.log(`➜ ${printMessage(error)}`)
    }
    console.log('\n')
  }

  // TODO check if pre-commit checks are set up
  // TODO check if GitHub on-push workflow is set up
  // TODO check if codeowners is set up
  // TODO check if license (and package.json license field) is set up
  // TODO check if README is set up (and contains something other than the default CRA README)
}

main()
