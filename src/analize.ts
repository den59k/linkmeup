import ts from 'typescript'
import fs from 'fs'

// const file = fs.readFileSync(__dirname+"/index.ts", "utf-8")


const program = ts.createProgram([ __dirname+"/index.ts" ], { })
const sourceFile  = program.getSourceFile(__dirname+"/index.ts")!

// To print the AST, we'll use TypeScript's printer
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

const typeChecker = program.getTypeChecker()

// To give constructive error messages, keep track of found and un-found identifiers
const unfoundNodes: ts.Node[] = [], foundNodes: ts.Node[] = [];

const isLink = (node: ts.Node) => {
  if (!ts.isCallExpression(node)) return false
  if (!ts.isPropertyAccessExpression(node.expression)) return false

  const symbol = typeChecker.getSymbolAtLocation(node.expression)
  if (symbol && "parent" in symbol) {
    const parent = symbol.parent as ts.Symbol
    if (parent.escapedName === "LinkMeUpServer") {
      return true
    }
  }
}

const reccur = (node: ts.Node) => {
  
  if (ts.isPropertyAccessExpression(node)) {

    // console.log(typeChecker.getSymbolAtLocation(node))
    const symbol = typeChecker.getSymbolAtLocation(node)
    if (symbol && "parent" in symbol) {
      const parent = symbol.parent as ts.Symbol
      if (parent.escapedName === "LinkMeUpServer") {
        
      }
    }
    
  }

  if (isLink(node) && ts.isCallExpression(node)) {
    const firstArgument = node.arguments[0]
    if (ts.isStringLiteral(firstArgument)) {
      console.log(firstArgument.text)
    }
    const secondArgument = node.arguments[1]

    const type = typeChecker.getTypeAtLocation(secondArgument)

    const signature = typeChecker.getSignaturesOfType(type, ts.SignatureKind.Call)[0]
    // console.log(signature.getDeclaration())

    const params = signature.getParameters()

    const paramType = typeChecker.getTypeAtLocation(params[0].getDeclarations()![0])
    
    const signature2 = paramType
    // console.log(signature2)
    

    // console.log(params[0])

    console.log(typeChecker.signatureToString(signature))
  }


  ts.forEachChild(node, reccur)
}

reccur(sourceFile)

for (let node of sourceFile.statements) {


  // if (node.kind === 241) {
  //   console.log(node)
  // }

  // console.log("NODE ", node.kind)
  // console.log(printer.printNode(ts.EmitHint.Unspecified, node, sourceFile))
}

