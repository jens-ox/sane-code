import lockfileChecker from './checks/lockfiles'
import packageJsonChecker from './checks/packageJson'

export async function main() {
  await packageJsonChecker()
  await lockfileChecker()

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
