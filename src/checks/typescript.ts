import { Project, SourceFile } from 'ts-morph'
import { Checker, Level, Message } from '../types'
import glob from '../utils/glob'

/**
 * Checks if a source file contains at least one class-based React component.
 * In this context, a class-based React component is a class declaration with a render function.
 *
 * @param file file to be analyzed
 * @returns whether or not the file includes at least one class-based React component
 */
const hasReactClass = async (file: SourceFile): Promise<boolean> => {
  const classes = file.getClasses()

  if (classes.length === 0) return false

  const fileHasReactClassComponent = classes.some((c) => c.getMethods().some((m) => m.getName() === 'render'))

  return fileHasReactClassComponent
}

const analyzeFile = async (file: SourceFile): Promise<Array<Message>> => {
  const errors: Array<Message> = []
  const path = file.getFilePath().replace(process.cwd(), '.')

  const reactClass = await hasReactClass(file)
  if (reactClass) {
    errors.push({
      level: Level.WARN,
      message:
        'Looks like this file contains a class-based React component. Consider using a function-based React component instead.',
      file: path
    })
  }
  return errors
}

const analyzeProject = async (project: Project): Promise<Array<Message>> => {
  return (await Promise.all(project.getSourceFiles().map((f) => analyzeFile(f)))).flat()
}

const typescriptChecker: Checker = async () => {
  const tsconfigFiles = await glob('./**/tsconfig.json', { ignore: './**/node_modules/**/*' })

  return (await Promise.all(tsconfigFiles.map((t) => analyzeProject(new Project({ tsConfigFilePath: t }))))).flat()
}

export default typescriptChecker
