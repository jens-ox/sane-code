/* eslint-disable @typescript-eslint/ban-types */

// This code is more or less completely stolen from https://github.com/nadeesha/ts-prune/blob/master/src/analyzer.ts.

import {
  ExportDeclaration,
  SourceFile,
  SourceFileReferencingNodes,
  ts,
  SyntaxKind,
  StringLiteral,
  ObjectBindingPattern,
  ImportDeclaration,
  Symbol
} from 'ts-morph'
import { Level, Message } from '../types'

type ResultSymbol = {
  name: string
  line?: number
  usedInModule: boolean
}

function handleExportDeclaration(node: SourceFileReferencingNodes) {
  return (node as ExportDeclaration).getNamedExports().map((n) => n.getName())
}

/**
 * Given an `import * as foo from './foo'` import, figure out which symbols in foo are used.
 *
 * If there are uses which cannot be tracked, this returns ["*"].
 */
const trackWildcardUses = (node: ImportDeclaration) => {
  const clause = node.getImportClause()
  const namespaceImport = clause?.getFirstChildByKind(ts.SyntaxKind.NamespaceImport)
  const source = node.getSourceFile()

  const uses = source
    .getDescendantsOfKind(ts.SyntaxKind.Identifier)
    .filter((n) => (!namespaceImport ? false : (n.getSymbol()?.getDeclarations() ?? []).includes(namespaceImport)))

  const symbols: string[] = []
  for (const use of uses) {
    if (use.getParentIfKind(SyntaxKind.NamespaceImport)) {
      // This is the "import * as module" line.
      continue
    }

    const p = use.getParentIfKind(SyntaxKind.PropertyAccessExpression)
    if (p) {
      // e.g. `module.x`
      symbols.push(p.getName())
      continue
    }

    const el = use.getParentIfKind(SyntaxKind.ElementAccessExpression)
    if (el) {
      const arg = el.getArgumentExpression()
      if (arg?.getKind() === SyntaxKind.StringLiteral) {
        // e.g. `module['x']`
        symbols.push((arg as StringLiteral).getLiteralText())
        continue
      }
    }

    const varExp = use.getParentIfKind(SyntaxKind.VariableDeclaration)
    if (varExp) {
      const nameNode = varExp.getNameNode()
      if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
        const binder = nameNode as ObjectBindingPattern
        for (const bindEl of binder.getElements()) {
          const p = bindEl.getPropertyNameNode()
          if (p) {
            // e.g. const {z: {a}} = module;
            symbols.push(p.getText())
          } else {
            // e.g. const {x} = module;
            symbols.push(bindEl.getName())
          }
        }
        continue
      }
    }

    const qualExp = use.getParentIfKind(SyntaxKind.QualifiedName)
    if (qualExp) {
      // e.g. type T = module.TypeName;
      symbols.push(qualExp.getRight().getText())
      continue
    }

    // If we don't understand a use, be conservative.
    return ['*']
  }

  return symbols
}

function handleImportDeclaration(node: ImportDeclaration) {
  return [
    ...node.getNamedImports().map((n) => n.getName()),
    ...(node.getDefaultImport() ? ['default'] : []),
    ...(node.getNamespaceImport() ? trackWildcardUses(node) : [])
  ]
}

// like import("../xyz")
function handleDynamicImport() {
  // a dynamic import always imports all elements, so we can't tell if only some are used
  return ['*']
}

const nodeHandlers = {
  [ts.SyntaxKind.ExportDeclaration.toString()]: handleExportDeclaration,
  [ts.SyntaxKind.ImportDeclaration.toString()]: handleImportDeclaration,
  [ts.SyntaxKind.CallExpression.toString()]: handleDynamicImport
}

const lineNumber = (symbol: Symbol) =>
  symbol
    .getDeclarations()
    .map((decl) => decl.getStartLineNumber())
    .reduce((currentMin, current) => Math.min(currentMin, current), Infinity)

const getExported = (file: SourceFile) =>
  file.getExportSymbols().map((symbol) => ({
    name: symbol.compilerSymbol.name,
    line: lineNumber(symbol)
  }))

const printSymbol = (entry: ResultSymbol): string => {
  const base = `${entry.name}${typeof entry.line !== 'undefined' && ` (L${entry.line})`}`
  return entry.usedInModule
    ? `${base} seems to be only used in module, remove export statement`
    : `${base} seems unused, consider deleting`
}

const getPotentiallyUnused = (file: SourceFile): Array<Message> => {
  const exported = getExported(file)

  const idsInFile = file.getDescendantsOfKind(ts.SyntaxKind.Identifier)
  const referenceCounts = (idsInFile ?? []).reduce(
    (acc, id) => ({ ...acc, [id.getText()]: (acc[id.getText()] ?? 0) + 1 }),
    {} as Record<string, number>
  )
  const referencedInFile = Object.entries(referenceCounts).reduce(
    (previous, [name, count]) => [...previous, ...(count > 1 ? [name] : [])],
    [] as Array<string>
  )

  const referenced = file.getReferencingNodesInOtherSourceFiles().reduce((previous, node) => {
    const kind = node.getKind().toString()
    const value = nodeHandlers?.[kind]?.(node as ImportDeclaration) ?? []

    return previous.concat(value)
  }, [] as Array<string>)

  const unused = referenced.includes('*')
    ? []
    : exported
        .filter((exp) => !referenced.includes(exp.name))
        .map((exp) => ({ ...exp, usedInModule: referencedInFile.includes(exp.name) }))

  return unused.map((e) => ({ level: Level.WARN, message: printSymbol(e) }))
}

export const analyze = (file: SourceFile): Array<Message> => {
  const errors: Array<Message> = []

  // check if file contains unused symbols
  const originalText = file.getFullText()
  const isMinimal = file.fixUnusedIdentifiers().getFullText() === originalText
  if (!isMinimal) errors.push({ level: Level.ERROR, message: 'File contains unused symbols, please remove them' })

  const potentiallyUnused: Array<Message> = getPotentiallyUnused(file)

  return [...errors, ...potentiallyUnused]
}
