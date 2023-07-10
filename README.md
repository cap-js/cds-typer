# CDS type generator for JavaScript

## About this project

Generates `.ts` files for a CDS model to receive code completion in VS Code.


## Requirements and Setup
This project is [available as `@cap-js/cds-typer`](https://www.npmjs.com/package/@cap-js/cds-typer) as NPM package.

### Usage
The type generator can either be used as a standalone tool, or as part of of the [CDS VSCode-Extension](https://www.npmjs.com/package/@sap/vscode-cds).

#### Standalone CLI
Assuming you have the following CDS project structure:

```
/home/
├── mybookshop/
│   ├── db/
│   │   └── schema.cds
│   ├── srv/
│   │   └── service.js
```

a typical workflow to generate types for your CDS project could look something like this:

```sh
npx @cap-js/cds-typer /home/mybookshop/db/schema.cds --outputDirectory /home/mybookshop/@types
```

You would then end up with a directory `@types`, which contains your entities and their accompanying types in a directory structure. The directory structure directly reflects the namespaces you have defined your entities in. They have to be imported in any JavaScript-based service handlers you want to have type support in and can replace calls to `cds.entities(...)`:

```js
// srv/service.js
const { Books } = require('my.bookshop')
```

becomes

```js
// srv/service.js
const { Books } = require('../@types/mybookshop')
```

From that point on you should receive code completion from the type system for `Books`.

_Note:_ the above command generates types for the model contained within the mentioned `schema.cds` file. If you have multiple `.cds` files that are included via `using` statements by `schema.cds`, then those files will also be included in the type generation process. If you have `.cds` files that are _not_ in some way included in `schema.cds`, you have to explicitly pass those as positional argument as well, if you want types for them.

_cds-typer_ comes with rudimentary CLI support and a few command line options:

- `--help`: prints all available parameters.
- `--outputDirectory`: specifies the root directory where all generated files should be put. Defaults to the CWD.
- `--jsConfigPath`: specifies the path to the `jsconfig.json` file to generate. Usually your project's root directory. If specified, a config file is created that restricts the usage of types even further:

```js
// generated .ts file
class Book {
    title: string;
}

// some hook in your service
SELECT(Books, b => {
    b.title // 👍 no problem, property exists
    b.numberOfPages // ❌ property does not exist
})
```
With the generated config in place, the language server will display an error, telling you that `numberOfPages` does not exist in this context. Without the config it would just infer it as `any`.

- `--loglevel`: minimum log level that should be printed. Defaults to `NONE`. Available log levels roughly follow [Microsoft's dotnet log levels](https://docs.microsoft.com/en-us/dotnet/api/microsoft.extensions.logging.loglevel?view=dotnet-plat-ext-6.0):

```
TRACE
DEBUG
INFO
WARNING
ERROR
CRITICAL
NONE
```

The utility expects (at least) one path to a `.cds` file as positional parameter which serves as entry point to the model in question, e.g.:

```sh
npx @cap-js/cds-typer ./path/to/my/model/model.cds --outputDirectory /tmp/
```

Note that you can also pass multiple paths or `"*"` as glob pattern (with quotes to circumvent expansion by the shell). This passes the pattern on to the compiler where the [regular resolve strategy](https://cap.cloud.sap/docs/node.js/cds-compile?q=compiler#cds-resolve) is used.

#### From VSCode
Installing the [CDS VSCode Extension](https://www.npmjs.com/package/@sap/vscode-cds) also adds support for generating types for your model from within VSCode. Adding the appropriate facet to your project via `cds add typer` (and installing the added dependencies thereafter) allows you to simply hit save on any `.cds` file that is part of your model to trigger the generation process.
#### Programmatically
The main API for using _cds-typer_ within another project is contained in [`compile.js`](https://github.tools.sap/cap/cds-typer/blob/master/lib/compile.js), specifically:

- `compileFromFile(…)` to parse a `.cds` file. This involves compiling it to CSN first.
- `compileFromCSN(…)` to directly compile from CSN object. This is useful when you already have your CSN available as part of a tool chain. ⚠️ **WARNING**: the application of `cdstyper` may be impure, meaning that it _could_ alter the provided CSN. If you use the typer this way, you may want to apply it as last step of your tool chain.


### Features
#### Plural Types
While CDS encourages the use of plural form for defined entities, their OOP equivalent classes are usually named in singular. _cds-typer_ automatically transforms entity names to singular and adds the plural form for arrays:

```cds
entity Books : cuid {
    …
}
```

becomes

```ts
class Book {
	…
}

class Books extends Array<Book> {}
```

If you need to customise the singular or plural form, or if your entities are already in singular form, you can do so using annotations:

```cds
@singular: 'Mouse'
entity Mice {}

@plural: 'SomeListList'
entity SomeList {}
```

results in

```ts
class Mouse { … }
class Mice extends Array<Mouse> { … }

class SomeList { … }
class SomeListList extends Array<SomeList> { … }
```

### Relation to _cds2types_
This project is inspired by the existing [_cds2types_](https://github.com/mrbandler/cds2types), but differs in a few aspects:

#### Reworked Imports
Instead of one monolithic `.d.ts` file containing all entities in nested namespaces, multiple files are generated where each namespace is represented by a directory structure. This facilicates simpler imports in a more Java-esque style:

```js
const types = require('./cds2types/compiled.d.ts')

console.log(types.sap.cap.bookshop.Books) // a class
```

becomes

```js
const { Books } = require('./cds-typer/sap/cap/bookshop')

console.log(Books) // the same class
```

#### Usable in Javascript Projects
Generated code is usable from within plain Javascript projects. The code generated by _cds2types_ would represent each cds-entity as an interface, which are not visible to Javascript projects. _cds-typer_ uses classes instead.

#### Faster
_cds2types_ takes a detour to create a Typescript AST first and then print out the formatted source files. _cds-typer_ directly walks the linked CSN and creates strings on the fly. Also, file operations are `async`. These two changes speed up _cds-typer_ by around one to two orders of magnitude compared to _cds2types_.

#### Small Footprint
_cds-typer_ tries to keep its dependency footprint as small as possible. Libraries like `typescript` are only needed as dev dependencies.






## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/cap-js/cds-typer/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/cap-js/.github/blob/main/CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright 2022-2022 SAP SE or an SAP affiliate company and cds-typer contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/SAP/cds-dts-generator).
