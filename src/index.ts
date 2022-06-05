import lockfileChecker from './checks/lockfiles'
import packageJsonChecker from './checks/packageJson'

export async function main() {
  await packageJsonChecker()
  await lockfileChecker()
}

main()
