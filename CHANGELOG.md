# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).
The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Version 0.6.2 - TBD

### Changed

### Added
- Support for `[many] $self` syntax in bound action parameters

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
