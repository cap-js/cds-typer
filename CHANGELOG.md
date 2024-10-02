# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).
The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Version 0.28.0 - TBD

## Version 0.27.0 - 2024-10-02
### Changed
- Any configuration variable (via CLI or `cds.env`) can now be passed in snake_case in addition to camelCase
- Action parameters are now generated as optional by default, which is how the runtime treats them. Mandatory parameters have to be marked as `not null` in CDS/CDL, or `notNull` in CSN.

### Fixed
- Fix build task for projects with spaces
- Fixa bug where cds-typer would produce redundant type declarations when the model contains an associations to another entity's property

## Version 0.26.0 - 2024-09-11
### Added
- Added a static `.keys` property in all entities. That property is dictionary which holds all properties as keys that are marked as `key` in CDS
- Added a CLI option `--useEntitiesProxy`. When set to `true`, all entities are wrapped into `Proxy` objects during runtime, allowing top level imports of entity types.
- Added a static `.kind` property for entities and types, which contains `'entity'` or `'type'` respectively
- Apps need to provide `@sap/cds` version `8.2` or higher.
- Apps need to provide `@cap-js/cds-types` version `0.6.4` or higher.
- Typed methods are now generated for calls of unbound actions. Named and positional call styles are supported, e.g. `service.action({one, two})` and `service.action(one, two)`.
- Action parameters can be optional in the named call style (`service.action({one:1, ...})`).
- Actions for ABAP RFC modules cannot be called with positional parameters, but only with named ones. They have 'parameter categories' (import/export/changing/tables) that cannot be called in a flat order.
- Services now have their own export (named like the service itself). The current default export is not usable in some scenarios from CommonJS modules.
- Enums and operation parameters can have doc comments


## Version 0.25.0 - 2024-08-13
### Added
- Declaring a type alias on an enum in cds now also exports it on value level in the resulting type

### Fixed
- Classes representing views and projections will no longer carry ancestry to avoid clashes thereof with aliases fields

### Changed
- All properties are now preceeded with the `declare` modifier to pass strict tsconfigs using `useDefineForClassFields` or `noImplicitOverride`
- The static `actions` property of generated classes now includes the types from all inherited classes to also suggest actions defined in a base entity/aspect/type.

## Version 0.24.0 - 2024-07-18
### Fixed
- Suppressed an error that would incorrectly point out naming clashes when an entity was named in singular inflection in the model
- CDS aspects now also generate a aspect-function in singular inflection, similar to how entities do

### Changed
- Aspects generate named classes again so that tooltips will show more meaningful provenance for properties
- The TypeScript task for `cds build` no longer looks for tsconfig.json to determine if the project has TS nature and instead checks the dependencies in the project's package.json for an occurrence of `typescript`

## Version 0.23.0 - 2024-07-04

### Fixed
- Plurals no longer have `is_singular` attached in the resulting .js files
- Properties are properly propagated beyond just one level of inheritance


## Version 0.22.0 - 2024-06-20

### Fixed
- Fixed a bug where keys would sometimes inconsistently become nullable

### Changed
- Logging now internally uses `cds.log` and pipes output into the `cds-typer` logger, which can be configured via `cds.env` in addition to explicitly passing a `--logLevel` parameter to CLI. Users now have to use the levels defined in [`cds.log.levels`](https://cap.cloud.sap/docs/node.js/cds-log#log-levels). The formerly valid levels `WARNING`, `CRITICAL`, and `NONE` are now deprecated and automatically mapped to valid levels for now.

## Version 0.21.2 - 2024-06-06
### Fixed
- The typescript build task will no longer attempt to run unless at least cds 8 is installed

## Version 0.21.1 - 2024-06-03
### Fixed
- Added missing _cds-plugin.js_ to exported files to properly enable calling `cds build --for typescript`


## Version 0.21.0 - 2024-05-31
### Added
- Added `IEEE754Compatible` flag which, when set to `true`, generates decimal fields as `(number | string)` instead of `number`. This flag will be removed in the long run
- Added plugin to `cds build` TypeScript projects. Can be explicitly called using `cds build --for typescript`

### Changed
- Types representing CDS events are now only `declare`d to avoid having to make their properties optional
- Singular forms in generated _index.js_ files now contain a `.is_singular` property as marker for distinguished handling of singular and plural in the runtime
- Parameters passed to the CLI now take precedence over configuration contained in the `typer` section of `cds.env`

### Fixed
- Entities ending with an "s" are no longer incorrectly truncated within `extends`-clauses
- Entity names prefixed with their own namespace (e.g. `Name.Name`, `Name.NameAttachments`) are not stripped of their name prefix

## Version 0.20.2 - 2024-04-29
### Fixed
- Referring to a property's type in a function/ action parameter no longer refers to the enclosing entity

## Version 0.20.1 - 2024-04-24
### Fixed
- Void actions no longer crash the type generation process

## Version 0.20.0 - 2024-04-23
### Added
- Types for actions and functions now expose a `.kind` property which holds the string `'function'` or `'action'` respectively
- Added the `CdsDate`, `CdsDateTime`, `CdsTime`, `CdsTimestamp` types, which are each represented as a `string`.
- Plural types can now also contain an optional numeric `$count` property

### Changed
- Empty `.actions` properties and operations without parameters are now typed as `Record<never, never>` to make it clear they contain nothing and also to satisfy overzealous linters

### Fixed
- Composition of aspects now properly resolve implicit `typeof` references in their properties
- Importing an enum into a service will now generate an alias to the original enum, instead of incorrectly duplicating the definition
- Returning entities from actions/ functions and using them as parameters will now properly use the singular inflection instead of returning an array thereof
- Aspects are now consistently named and called in their singular form
- Only detect inflection clash if singular and plural share the same namespace. This also no longer reports `sap.common` as erroneous during type creation

## Version 0.19.0 - 2024-03-28
### Added
- Support for `cds.Vector`, which will be represented as `string`

## Version 0.18.2 - 2024-03-21
### Fixed
- Resolving `@sap/cds` will now look in the CWD first to ensure a consistent use the same CDS version across different setups
- Types of function parameters starting with `cds.` are not automatically considered builtin anymore and receive a more thorough check against an allow-list


## Version 0.18.1 - 2024-03-13
### Fix
- Remove faulty plural for CDS `type` definitions from the generated _index.js_ files

## Version 0.18.0 - 2024-03-12
### Added
- Improved support for projections, including projections on inline definitions, and on views, as well as support for explicit exclusion and selection of properties

### Changed
- [breaking] CDS `type` definitions will not be inflected. Whatever inflection you define them in will be assumed treated as a singular form and will not receive a plural form anymore

## Version 0.17.0 - 2024-03-05
### Fixed
- Fixed a bug where refering to an externally defined enum via the `typeof` syntax would crash the type generation

## Version 0.16.0 - 2024-02-01
### Changed
- Changed default log level from `NONE` to `ERROR`. See the doc to manually pass in another log level for cds-typer runs
- Name collisions between automatically generated foreign key fields (`.…_ID`, `.…_code`, etc.) with explicitly named fields will now raise an error
- Generate CDS types that are actually structured types as if they were entities. This allows the correct representation of mixing aspects and types in CDS inheritance, and also fixes issues with inline enums in such types

### Fixed
- Externally defined enums can now be used as parameter types in actions

## Version 0.15.0 - 2023-12-21
### Added
- Support for [scoped entities](https://cap.cloud.sap/docs/cds/cdl#scoped-names)
- Support for [delimited identifiers](https://cap.cloud.sap/docs/cds/cdl#delimited-identifiers)

### Fixed
- Inline enums are now available during runtime as well
- Inline enums can now be used as action parameter types as well. These enums will not have a runtime representation, but will only assert type safety!
- Arrays of inline enum values can now be used as action parameters too. But they will only be represented by their enclosing type for now, i.e. `string`, `number`, etc.
- Foreign keys of projection entities are now propagated as well

## Version 0.14.0 - 2023-12-13
### Added
- Entities that are database views now also receive typings

## Version 0.13.0 - 2023-12-06
### Changed
- Enums are now generated ecplicitly in the respective _index.js_ files and don't have to extract their values from the model at runtime anymore

### Added
- The `excluding` clause in projections now actually excludes the specified properties in the generated types

## Version 0.12.0 - 2023-11-23

### Changed
- Generate `cds.LargeBinary` as string, buffer, _or readable_ in the case of media content

### Added
- Added support for the `not null` modifier

### Fixed
- Now using names of enum values in generated _index.js_ files if no explicit value is present

## Version 0.11.1 - 2023-10-12

### Changed

### Added
### Fixed
- Fixed how service names are exported as default export

## Version 0.11.0 - 2023-10-10

### Changed

### Added
- Autoexposed entities in services are now also generated
- Each generated class now contains their original fully qualified name in a static `.name` property
- Inline enums that are defined as literal type of properties are now supported as well (note: this feature is experimental. The location to which enums are generated might change in the future!)

### Fixed
- Fixed an error when an entity uses `type of` on a property they have inherited from another entity
- Fixed an error during draftability propagation when defining compositions on types that are declared inline

### Removed
- `compileFromCSN` is no longer part of the package's API

## Version 0.10.0 - 2023-09-21

### Changed
- Actions and functions are now attached to a static `.actions` property of each generated class. This reflects the runtime behaviour better than the former way of generating instance methods

### Added

### Fixed

## Version 0.9.0 - 2023-09-08

### Changed

### Added
- Support for drafts via `@odata.draft.enabled` annotation

### Fixed
- Foreign keys are now propagated more than one level (think: `x_ID_ID_ID`)


## Version 0.8.0 - 2023-09-05

### Changed

### Added

### Fixed
- Foreign keys that are inherited via aspects are now also generated in addition to the resolved property (see 0.7.0)
- Explicitly annotated `@singular` and `@plural` names are now properly used in generated _index.js_ files


## Version 0.7.0 - 2023-08-22

### Changed

### Added
- Support for `[many] $self` syntax in bound action parameters
- Foreign keys are now present in the generated types in addition to the resolved property

### Fixed
## Version 0.6.1 - 2023-08-10

### Changed

### Added

### Fixed
- Removed a warning about circular imports

## Version 0.6.0 - 2023-08-07

### Added
- Support for `event` syntax

### Fixed
- Initialise bound actions with stubs to support `"strict":true` in _tsconfig.json_
- Add leading underscore to appease `noUnusedParameters` in strict tsconfigs
- No longer inflect `type` definitions when they are referenced within entities or other type definitions

## Version 0.5.0 - 2023-07-25

### Changed
- Facilitate strict property checks. Note: `checkJs: true` must be present in the project's _jsconfig.json_ or _tsconfig.json_ respectively for this feature to become effective

### Added
- Support for `array of` syntax

### Fixed
- Generate `string` type for date-related types in CDS definitions
- Generate `Buffer | string` type for the CDS type `LargeBinary`


## Version 0.4.0 - 2023-07-06
### Added
- Support for enums when they are defined separately (not inline in the property type of an entity)

## Version 0.3.0 - 2023-06-26
### Added
- Support `function` definitions (apart from `action`s)
### Changed
- Bump version to next minor

### Fixed
- Properly import CDS `type` definitions when they are referenced elsewhere

## Version 0.2.5-beta.1 - 2023-06-13

### Changed
- Bump version

## Version 0.2.4 - 2023-06-12
- Enable use of annotated singular/ plural names in associations/ compositions
- Rename package from `@sap/cds-dts-generator` to `@cap-js/cds-typer`

## Version 0.2.3 - 2023-05-17
- Add missing library files

## Version 0.2.2 - 2023-05-17
- Make class hierarchy flatter

## Version 0.2.1 - 2023-05-16
- Add missing files

## Version 0.2.0 - 2023-05-15
- use native Typescript AST in unit tests
- add `propertiesOptional` flag
- support flat, as well as nested inline declarations
- support `typeof` syntax
- read rudimentary configuration from cds.env
- export bound and unbound actions
- allow inline type definitions within compositions
- enable use of additional type libraries (HANA types available as first library)
- provide proper JSDoc for all modules
- export entity types for singular variants alongside plural types
## Version 0.1.1 - 2023-01-26
- add TL;DR section to README
- allow multiple positional arguments

## Version 0.1.0
- initial code base
