## Type Generation
The `cds-dts-generator` package offers a way to derive Typescript definitions from a CDS model to give users enhanced code completion and a certain degree of type safety when implementing services. The following chapter describes the package in detail.

⏩ _You may skip ahead to the [Quickstart](#quickstart) section if you just want to get everything up and running for your project in a VSCode environment._

Note that this chapter uses the [bookshop sample](https://github.com/SAP-samples/cloud-cap-samples/tree/main/bookshop) as a running sample.

### `typer` Facet
Type generation can be added to your project via `cds add typer`. Under the hood, this does three things:

1. Adds `@sap/cds-dts-generator` as a dev-dependency (⚠️ which you still have to install using `npm i`)
2. Creates (or modify) a _jsconfig.json_ file to support 
  - intellisense for the generated types
  - enable a strict mode to treat missing properties in types as error (`checkJs`)
3. Modifies _package.json_ to enable [subpath imports](https://nodejs.org/api/packages.html#subpath-imports) for the generated types

> ⚠️ **Adding the facet in a Typescript project** will adjust your _tsconfig.json_ instead. Note that you may have to manually add type generator's configured output directory to the `rootDirs` entry in your 
_tsconfig.json_, as we do not want to interfere with your configuration.

You can now already call the type generator CLI at this point:

```sh
./node_modules/@sap/cds-dts-generator/lib/cli.js ./srv/index.cds --outputDirectory ./@types
```

### Emitted Type Files

 The emitted types are bundled into a directory which contains a nested directory structure that mimics the namespaces of your CDS model. For the sake of brevity, we will assume them to be in a directory called `@types` in your project's root in the following sections.
For example, the sample model contains a namespace `sap.capire.bookshop`. You will therefore find the following file structure after the type generation has finished:

```
@types
└───sap
    └───capire
        └───bookshop
              index.js
              index.ts
```

Each _index.ts_ file will contain type information for one namespace. For each entity belonging to that namespace, you will find two exports, a singular and a plural form:

```ts
// @types/sap/capire/bookshop/index.ts
export class Author …
export class Authors …
export class Book …
export class Books …
```

The singular forms represent the entities from the original model and try to adhere to best practices of object oriented programming for naming classes in singular.
The plural form exists as a convenience to refer to a collection of multiple entities. You can [fine tune](#fine-tuning) both singular and plural names that are used here.

At this point, you could already import these types by using absolute paths, but there is a more convenient way for doing so which will be described in the next section.

### Subpath Imports
Adding type support via `cds add typer` includes adding [subpath imports](https://nodejs.org/api/packages.html#subpath-imports). Per default, the facet adds a mapping of `#model/` to the default path your model's types are assumed to be generated to (`<project root>/@types/`). If you are generating your types to another path and want to use subpath imports, you may have to adjust this setting in your _package.json_ and _jsconfig.json_/ _tsconfig.json_ accordingly.

Consider [the bookshop sample](https://github.com/SAP-samples/cloud-cap-samples/tree/main/bookshop) with the following structure with types already generated into `@types`:

```
bookstore
│   package.json
│
└───@types
│   └───<see above>
│
└───db
│      schema.cds
│      …
│   
└───srv
│      cat-service.cds
│      cat-service.js
│       …
│
└─── …
```

The following two (equally valid) statements would amount to the same import [from the catalogue service](https://github.com/SAP-samples/cloud-cap-samples/blob/main/bookshop/srv/cat-service.js):

```js
// srv/cat-service.js
const { Books } = require('../@types/sap/capire/bookshop')
const { Books } = require('#model/sap/capire/bookshop')
```

These imports will behave like [`cds.entities('sap.capire.bookshop')`](https://pages.github.tools.sap/cap/docs/node.js/cds-reflect#entities) during runtime, but offer you code completion and type hinting at design time:

```js
class CatalogService extends cds.ApplicationService { init(){
  const { Book } = require('#model/sap/capire/bookshop')

  this.on ('UPDATE', Book, req => {
    // in here, req is known to hold a payload of type Book.
    // Code completion therefore offers all the properties that are defined in the model.
  })
})
```

Note that just as with `cds.entities(…)`, these imports cannot be static, but need to be dynamic:

```js
// ❌ works during design time, but will cause runtime errors
const { Book } = require('#model/sap/capire/bookshop')

class CatalogService extends cds.ApplicationService { init(){
  // ✅ works both at design time and at runtime
  const { Book } = require('#model/sap/capire/bookshop')
})
```

### Using Emitted Types in Your Service
The types emitted by the type generator are tightly integrated with the CDS API. The following section elucidates where the generated types are recognised by CDS.

#### CQL

Most CQL constructs have an overloaded signature to support passing in generated types. Chained calls will offer code completion related to the type you pass in.

```js
// how you would have done it before (and can still do it)
SELECT('Books')  // etc...

// how you can do it using generated types
const { Book, Books } = require('#model/sap/capire/Bookshop')

// SELECT
SELECT(Books)
SELECT.one(Book)
SELECT(Books, b => { b.ID })  // projection
SELECT(Books, b => { b.author(a => a.ID) })  // nested projection

// INSERT / UPSERT
INSERT.into(Books, […])
INSERT.into(Books).columns(['title', 'ID'])  // column names derived from Books' properties

// DELETE
DELETE(Books).byKey(42)
```

Note that your entities will expose additional capabilities in the context of CQL, such as the `.as(…)` method to specify an alias.

#### CRUD Handlers
The CRUD handlers `before`, `on`, and `after` accept generated types:

```js
// the paylod is known to contain Books inside the respective handlers
service.before('READ', Books, req => { … }
service.on('READ', Books, req => { … }
service.after('READ', Books, req => { … }
```
🚧 **NOTE to editors:** this particular section is subject to change, as per our last sync.

Note that you can pass in both singular, as well as plural versions of your entity. Doing so will slightly alter the semantics of the handler. Passing the plural will result in a callback that is called _once_ with the entire result set. Passing the singular will cause the callback to be called once _for each_ element of the result set:

```js
service.on('READ', Books, req => req.data[0].ID)
service.on('READ', Book,  req => req.data.ID)
```

#### Actions

In the same manner, actions can be combined with `on`:

```js
const { submitOrder } = require('#model/sap/capire/Bookshop')

service.on(submitOrder, (…) => { /* implementation of 'submitOrder' */ })
```

> ⚠️ **Using anything but lambda functions** for either CRUD handler or action implementation will make it impossible for the LSP to infer the parameter types.

You can remedy this by specifying the expected type yourself via [JSDoc](https://jsdoc.app/):

```js
service.on('READ', Books, readBooksHandler)

/** @param {{ data: import('#model/sap/capire/Bookshop').Books }} req */
function readBooksHandler (req) { /* req.data is now properly known to be of type Books again */ }
```

### Integration into VSCode
Using the [SAP CDS Language Support extension for VSCode](https://marketplace.visualstudio.com/items?itemName=SAPSE.vscode-cds), you can make sure the generated type information stays in sync with your model. Instead of [manually calling](#type-generator-cli) the type generator every time you update your model, the extension will automatically trigger the process whenever you hit _save_ on a `.cds` file that is part of your model. 
Opening your VSCode settings and typing "`cds type generator`" into the search bar will reveal several options to configure the type generation process.
Output, warnings, and error messages of the process can be found in the output window called "`CDS`".
If you stick to the defaults, saving a `.cds` file will have the type generator emit [its type files](#emitted-type-files) into the directory `node_modules/@cap-js/cds-modules` in your project's root.

### Fine Tuning
#### Singular/ Plural
The generated types offer both a singular and plural form for convenience. The derivation of these names uses a heuristic that assumes entities are named with an English noun in plural form, following the [best practice guide](https://cap.cloud.sap/docs/guides/domain-modeling#pluralize-entity-names).

Naturally, this best practice can not be enforced on every model. Even for names that do follow best practices, the heuristic can fail. If you find that you would like to specify custom identifiers for singular or plural forms, you can do so using the `@singular` or `@plural` annotations:

```cds
// model.cds
@singular: 'Mouse'
entity Mice { … }

@plural: 'FlockOfSheep'
entity Sheep { … }
```

will emit the following types:

```ts
// index.ts
export class Mouse …
export class Mice …
export class Sheep …
export class FlockOfSheep …
```

### Quickstart
1. Make sure you have the [SAP CDS Language Support extension for VSCode](https://marketplace.visualstudio.com/items?itemName=SAPSE.vscode-cds) installed
2. In your project's root, execute `cds add typer`
3. Install the newly added dev-dependency using `npm i`
4. Saving any `.cds` file of your model triggers the type generation process
5. Model types can be imported to service implementation files using `require('#model/…')`