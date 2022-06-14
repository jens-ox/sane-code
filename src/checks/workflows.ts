import fs from 'fs/promises'
import YAML from 'yaml'
import { validateWorkflow } from '../helpers/validateSchema'
import { Checker, Level, Message } from '../types'
import glob from '../utils/glob'

const analyze = async (path: string): Promise<Array<Message>> => {
  const errors: Array<Message> = []

  const content = await fs.readFile(path, 'utf-8')
  let parsedContent
  try {
    parsedContent = YAML.parse(content)
  } catch (error) {
    return [
      {
        level: Level.ERROR,
        message: 'Not valid YAML',
        file: path
      }
    ]
  }

  // validate against schema
  const jsonErrors = await validateWorkflow(parsedContent)

  return [...errors, ...jsonErrors.map((e) => ({ ...e, file: path }))]
}

const workflowChecker: Checker = async () => {
  const errors: Array<Message> = []
  const workflows = await glob('./.github/workflows/*.yml', {
    ignore: './**/node_modules/**/*'
  })

  // at least one workflow should be set up to test PRs
  if (workflows.length === 0)
    errors.push({
      level: Level.WARN,
      message:
        'No GitHub workflow set up. Consider creating a workflow for testing pull requests (see https://docs.github.com/en/actions/quickstart).'
    })

  // parse each workflow file
  const errorMatrix = await Promise.all(workflows.map((w) => analyze(w)))

  return [...errors, ...errorMatrix.flat()]
}

export default workflowChecker
