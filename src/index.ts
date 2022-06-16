import chalk from 'chalk'
import eslintChecker from './checks/eslint'
import lockfileChecker from './checks/lockfiles'
import packageJsonChecker from './checks/packageJson'
import tsconfigChecker from './checks/tsconfig'
import typescriptChecker from './checks/typescript'
import workflowChecker from './checks/workflows'
import { getValidator } from './helpers/validateSchema'
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

async function main() {
  // initialize schema validator
  const validator = await getValidator()
  const problems = [
    ...(await packageJsonChecker(validator)),
    ...(await lockfileChecker(validator)),
    ...(await tsconfigChecker(validator)),
    ...(await eslintChecker(validator)),
    ...(await workflowChecker(validator)),
    ...(await typescriptChecker(validator))
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
}

main()
