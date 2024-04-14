import ts, { createLanguageService } from "typescript";
import { printAstTree, traverseNode } from "./traverseNode";

export const getReturnType = (funcType: ts.Type, typeChecker: ts.TypeChecker) => {
  const signature = typeChecker.getSignaturesOfType(funcType, ts.SignatureKind.Call)[0]
    
  const returnType = (typeChecker.getReturnTypeOfSignature(signature) as ts.TypeReference).typeArguments
  if (!returnType) return null

  const _node = typeChecker.typeToTypeNode(returnType[0], undefined, ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.NoTypeReduction | ts.NodeBuilderFlags.InTypeAlias)!
  return _node
}

export const getNodeText = (node: ts.Node) => {
  if (ts.isStringLiteral(node)) {
    return node.text
  }
  return node.getText()
}

export const generateDoc = (files: ts.SourceFile | ts.SourceFile[], typeChecker: ts.TypeChecker) => {

  const firstFile = Array.isArray(files)? files[0]: files
  if (!firstFile) return ""

  // const newFile = ts.createSourceFile("test", "", ts.ScriptTarget.ESNext)
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })

  const mapParamteters = (symbol: ts.Symbol) => {
    return ts.factory.createParameterDeclaration(
      undefined,
      undefined,
      symbol.name,
      undefined,
      typeChecker.typeToTypeNode(typeChecker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!), undefined, undefined)
    )
  }
  
  const serverNodes: any[] = []
  const methodNodes: any[] = []
  const outputImports = new Map<string, Set<string>>()

  const processFile = (file: ts.SourceFile) => {

    const imports = new Map<string, string[]>()
    const reverseImports = new Map<string, string>()
    traverseNode(file, (node) => {
      if (ts.isImportDeclaration(node)) {
        if (!ts.isStringLiteral(node.moduleSpecifier)) return
        const importName = node.moduleSpecifier.text
        if (importName === "stream") {

          const obj: string[] = imports.get(importName) ?? []
          imports.set(importName, obj)

          if (!node.importClause) return
          if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause?.namedBindings)) {
            for (let item of node.importClause.namedBindings.elements) {
              obj.push(item.name.text)
              reverseImports.set(item.name.text, importName)
            }
          }
          if (node.importClause?.name) {
            obj.push(node.importClause?.name.text)
            reverseImports.set(node.importClause?.name.text, importName)
          }
        }
      }
    })
  
    const addOutputImport = (type: string) => {
      const importObj = reverseImports.get(type)
      if (!importObj) return
      const set = outputImports.get(importObj) ?? new Set()
      set.add(type)
      outputImports.set(importObj, set)
    }

    traverseNode(file, (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression) && node.expression.escapedText === "createServer") {
          const callType = typeChecker.getTypeAtLocation(node.parent)
          const className = (callType as any).mapper.target.value

          const jsDoc = ts.getJSDocCommentsAndTags(node.parent);

          serverNodes.push({ name: className, jsDoc })
        }
        // console.log(callType.symbol)
        
        if (!ts.isPropertyAccessExpression(node.expression)) return
        if (node.expression.name.text !== "addMethod" && node.expression.name.text !== "addLongMethod") return

        const type = typeChecker.getTypeAtLocation(node.expression.expression)
        const className = (type as any).mapper.target.value

        const funcType = typeChecker.getTypeAtLocation(node.arguments[1])
        const signature = typeChecker.getSignaturesOfType(funcType, ts.SignatureKind.Call)[0]
        if (!signature) return

        const returnType = typeChecker.getReturnTypeOfSignature(signature) 
        const returnTypeNode = typeChecker.typeToTypeNode(returnType, undefined, undefined)

        for (let param of signature.parameters) {
          const type = typeChecker.getTypeOfSymbol(param)
          if (type.symbol) {
            addOutputImport(type.symbol.escapedName!)
          } else if (type.aliasSymbol) {
            console.log(type.aliasSymbol.escapedName, reverseImports.has(type.aliasSymbol.escapedName!))
          }
          
          // console.log(type)
        }

        const declare = ts.factory.createMethodSignature(
          undefined, 
          ts.factory.createIdentifier(getNodeText(node.arguments[0])), //node.arguments[0] as any,
          undefined,
          undefined,
          signature.parameters.map(mapParamteters),
          returnTypeNode
        )
        
        const jsDoc = ts.getJSDocCommentsAndTags(node.parent);
        
        if (jsDoc.length > 0) {
          methodNodes.push({
            group: className,
            doc: jsDoc[0]?.getText(),
            body: jsDoc[0]
          })
        }
        methodNodes.push({
          group: className,
          doc: jsDoc[0]?.getText(),
          body: declare
        })
      }
    })
  }

  if (Array.isArray(files)) {
    for (let file of files) {
      processFile(file)
    }
  } else {
    processFile(files)
  }

  const map = new Map<string, any[]>()
  for (let node of methodNodes) {
    if (!map.has(node.group)) {
      map.set(node.group, [])
    }
    map.get(node.group)!.push(node)
  }

  const getClientDeclaration = () => {
    const nodes = []
    for (let [ key, nodeGroup ] of map) {
      const node = ts.factory.createPropertySignature(
        undefined, 
        key,
        undefined, 
        ts.factory.createTypeLiteralNode(nodeGroup.map(node => node.body))
      )
      const serverNode = serverNodes.find(item => item.name === key)
      if (serverNode && serverNode.jsDoc.length > 0) {
        nodes.push(serverNode.jsDoc[0])
      }
      nodes.push(node)
    }
    return nodes
  }

  const declare2 = ts.factory.createModuleDeclaration(
    [ ts.factory.createToken(ts.SyntaxKind.DeclareKeyword) ], 
    ts.factory.createStringLiteral("linkmeup"), 
    ts.factory.createModuleBlock([
      ts.factory.createInterfaceDeclaration(undefined, ts.factory.createIdentifier("LinkMeUpClients"), undefined, undefined, getClientDeclaration())
    ]), 
    undefined
  )
  
  const outputimportsStr = []
  for (let [ key, value ] of outputImports) {
    const importDeclaration = ts.factory.createImportDeclaration(
      [], 
      ts.factory.createImportClause(false, undefined, ts.factory.createNamedImports(
        Array.from(value).map(item => ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(item)))
      )),
      ts.factory.createStringLiteral(key),
      undefined
    )
    outputimportsStr.push(printer.printNode(ts.EmitHint.Unspecified, importDeclaration, firstFile))
  }

  return [
    ...outputimportsStr,
    printer.printNode(ts.EmitHint.Unspecified, declare2, firstFile),
    "export {}"
  ].join("\n")
}