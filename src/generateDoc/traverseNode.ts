import ts from 'typescript'

export const traverseNode = (node: ts.Node, callback: (node: ts.Node) => boolean | void) => {
  if (callback(node) === true) {
    return
  }
  ts.forEachChild(node, cbNode => traverseNode(cbNode, callback))
}

export const printAstTree = (node: ts.Node) => {
  
  const nodeCallback = (node: ts.Node, indent = 0) => {
    let line = Array(indent).join("--")
    // if (line.length > 0) line = line.slice(0, -1)+"⌞"
    console.log(line, node.kind, node.getText())
    ts.forEachChild(node, cbNode => nodeCallback(cbNode, indent+1))
  }
  nodeCallback(node)
}