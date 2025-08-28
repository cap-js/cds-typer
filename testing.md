When contributing to cds-typer, providing a suitable set of unit tests is highly appreciated.

Most tests in the current suites follow the same structure:

1. define a model that exposes certain traits of CDS we want to the cds-typer against
2. generate the types for this model using cds-typer
3. parse the resulting files into a TypeScript AST
4. inspect the AST to confirm the generated code meets all expectations

The following section explores the process of writing new tests in detail.

## Writing a Test Model
Let's assume you want to support some feature "`X`" from CDS.
To make sure `X` can be tested in isolation you will start with creating a test model in `test/unit/files/X/model.cds` with a minimal model that focuses on `X`. Make sure the model is as brief and self-contained as possible.

Also, create a Jest testfile `test/X.test.js`. You can transfer the general structure from one of the existing test files.


## Programmatically Generating Types for Testing
For most tests you will compile the test model _once_ and then test several assumptions about the generated files through multiple test cases. The compilation of your model can be trigger through the `compileFromFile` method from the cds-typer core module. To make sure the tests run smoothly on all operating systems as well as in the CI pipeline, you should use the following utility functions:

`util.locations.unit.files(m)` will resolve the passed model `m` from the unit test directory to avoid any path confusion
`util.locations.testOutput(m)` creates a path for a temporary directory for the test suite `m` to generate files into


```ts
const { compileFromFile } = require('../../lib/compile')
const { ASTWrapper } = require('../ast')
const { locations } = require('../util')

const paths = await compileFromFile(locations.unit.files('X/model.cds'), { 
    outputDirectory: locations.testOutput('X') 
})
```

## Parsing Generated Types for Further Inspection
Calling `compileFromFile` will return a list of paths pointing to the files that were generated in the process. Note that there are certainly more elegant ways to retrieve one particular file than using a hard coded index.

Once you have determined the file you want to inspect, you can wrap them in an `ASTWrapper`. There are two wrappers available:

### `ASTWrapper` for TypeScript Files
This is the wrapper you are mainly working with for testing. It uses the native TypeScript compiler under the hood to load a given `.ts` file and parse it into an abstract syntax tree (AST). The wrapper class simplifies the structure of the original TS AST, which is quite verbose. This makes certain nodes significantly more accessible by removing some layers of indirection of enriching nodes with useful information.
You can produce such a wrapped AST as follows:

```js
let astw
beforeAll(async () => {
    const paths = await cds2ts.compileFromFile(locations.unit.files('X/model.cds'), { ... })
    astw = new ASTWrapper(path.join(paths[1], 'index.ts')) // or 'index.d.ts'
})
```

The downside of this process is that the wrapped AST only contains the nodes that are explicitly visited!
If you are contributing a feature that causes cds-typer to emit any TypeScript construct that has not been emitted before, chances are that the corresponding TypeScript AST nodes are simply ignored by the wrapper class.
In that case you have to adjust the wrapper accordingly.

### `JSASTWrapper` for JavaScript Files

cds-typer mainly emits TypeScript files, accompanied by a thin JavaScript wrapper around `cds.entities(...)` to make sure all imports work during runtime as well. The way these JavaScript files are generated will rarely change. But if you contribute a feature that causes a change in the JavaScript files, you should test them as well. For them you can use the `JSASTWrapper`.

```js
let ast
beforeAll(async () => {
    const paths = await cds2ts.compileFromFile(locations.unit.files('X/model.cds'), { ... })
    const jsastw = new JSASTWrapper(code)
})
```