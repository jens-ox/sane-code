# Sane Code

Run `npx sane-code` in your repo to check for things like

- JSON Schema validity of your `package.json`, `.eslintrc.js` etc
- unnecessary defaults in config files like `tsconfig.json` or `package.json`
- subjective code smells like `@types/*` in `dependencies` instead of `devDependencies`
- whether or not linting is set up
- if there's only one type of lockfile present
- whether or not the project depends on deprecated packages
- best practices like no hard-pins of dependencies, test script set up
- recommendations like enabling `esModuleInterop` in `tsconfig.json` etc
- unused TypeScript exports
- unused TypeScript symbols

Feel free to open issues if you have suggestions for more checks :relaxed:

## Development

1. Clone the repo
2. Add some checks
3. Run `npm run start` to run the checks on the `sane-code` repo itself