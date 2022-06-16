import fs from 'fs/promises'
import YAML from 'yaml'
import { Checker, Level, Message, ValidatorMethod } from '../types'
import glob from '../utils/glob'

const analyze = async (path: string, validator: Record<string, ValidatorMethod>): Promise<Array<Message>> => {
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
  const jsonErrors = await validator.workflow(parsedContent)

  // check if external actions are commit-locked
  const uses: Array<string> = Object.values(parsedContent.jobs ?? {})
    .flatMap((e: any) => e.steps ?? [])
    .map((s) => s.uses ?? null)
    .filter((u) => u !== null)

  const forbiddenUses = uses
    .filter((u) => !u.startsWith('actions/')) // allow official GitHub Actions actions
    .filter((u) => !/@[0-9a-f]{40}$/.test(u))

  errors.push(
    ...forbiddenUses.map((u) => ({
      level: Level.WARN,
      message: `You should commit-lock the external action "${u}" (see https://julienrenaux.fr/2019/12/20/github-actions-security-risk/)`,
      file: path
    }))
  )

  return [...errors, ...jsonErrors.map((e) => ({ ...e, file: path }))]
}

const workflowChecker: Checker = async (validator) => {
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
  const errorMatrix = await Promise.all(workflows.map((w) => analyze(w, validator)))

  return [...errors, ...errorMatrix.flat()]
}

export default workflowChecker
