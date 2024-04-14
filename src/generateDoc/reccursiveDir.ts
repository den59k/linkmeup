import { join } from 'path'
import { readdirSync } from 'fs'

const ignore = [ "node_modules" ]

export const readDir = (dir: string, callback: (filePath: string) => void) => {
  const items = readdirSync(dir, { withFileTypes: true })
  items.sort((a, b) => (a.isDirectory()? 1: 0) - (b.isDirectory()? 1: 0))
  for (let file of items) {
    if (file.isDirectory()) {
      if (ignore.includes(file.name) || file.name.startsWith(".")) continue
      
      readDir(join(dir, file.name), callback)
      continue
    }
    callback(join(dir, file.name))
  }
}

export const collectAllFiles = (rootDir: string) => {
  const files: string[] = []
  readDir(rootDir, file => {
    if (file.endsWith(".ts")) {
      files.push(file)
    }
  })
  return files
}