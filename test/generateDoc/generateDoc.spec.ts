import { expect, it } from 'vitest'
import ts from 'typescript'
import { generateDoc } from '../../src/generateDoc/generateDoc'

const program = ts.createProgram([
  `${__dirname}/source.ts`, `${__dirname}/source2.ts`
], { strictNullChecks: true, strict: true })
const typeChecker = program.getTypeChecker()

it("test generate doc", () => {
  const sourceFile = program.getSourceFile(`${__dirname}/source.ts`)!
  const resp = generateDoc(sourceFile, typeChecker)
  
  expect(resp).toEqual(`
import { Readable } from "stream";
declare module "linkmeup" {
    interface LinkMeUpClients {
        /**
         * Server for process video */
        testServer: {
            sum(a: number, b: number): Promise<number>;
            /**
             * Print size of file
             * @param image - source file
             * @return fileSize in bytes
             */
            fileSize(image: Buffer): Promise<number>;
            /**
             * Print hello world */
            helloWorld(image: Buffer): Promise<string>;
            getStreamSize(sourceStream: Readable): Promise<number>;
        };
    }
}
export {}
  `.trim())
})
