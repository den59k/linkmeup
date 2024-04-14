#!/usr/bin/env node

import { resolve } from "path";
import { generateDoc } from "./generateDoc/generateDoc";
import ts from 'typescript'
import { collectAllFiles } from "./generateDoc/reccursiveDir";
import fs from 'fs'

if (process.argv[2] === "generate") {
  console.info(`Generate linkmeup d.ts file...`)
  const path = resolve(process.argv[3] ?? "")
  const rootNames = collectAllFiles(path)
  
  const program = ts.createProgram(rootNames, { strictNullChecks: true, strict: true, noEmit: true })
  const typeChecker = program.getTypeChecker()
  
  const files = rootNames.map(item => program.getSourceFile(item)!).filter(item => !!item)
  const data = generateDoc(files, typeChecker)

  const outputFile = process.argv[4] ?? "linkmeup.d.ts"
  fs.writeFileSync(resolve(outputFile), data)
  console.info(`File ${outputFile} created!`)
} else {
  console.info("Use linkmeup generate <sourceDir> <targetFile> to create linkmeup d.ts file")
}
