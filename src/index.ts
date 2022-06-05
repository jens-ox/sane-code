import chalk from 'chalk'
import lockfileChecker from './checks/lockfiles'
import packageJsonChecker from './checks/packageJson'
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
  const problems = [...(await packageJsonChecker()), ...(await lockfileChecker())]

  // group problems by file
  const groupedProblems: Record<string, Array<Message>> = problems.reduce((acc, problem) => {
    const key = problem.file ?? 'no-file'
    acc[key] = acc[key] ? [...acc[key], problem] : [problem]
    return acc
  }, {})

  // echo problems
  for (const [file, errors] of Object.entries(groupedProblems)) {
    if (errors.length === 0) return
    console.log(chalk.bold(file))
    for (const error of errors) {
      console.log(printMessage(error))
    }
    console.log('\n')
  }

  // TODO run unimported
  // TODO check if typescript is set up
  // TODO check if linting is set up
  // TODO check if pre-commit checks are set up
  // TODO check if GitHub on-push workflow is set up
  // TODO check if codeowners is set up
  // TODO check if license (and package.json license field) is set up
  // TODO run ts-prune if typescript repo
}

main()
