# CDS type generator for JavaScript

[![REUSE status](https://api.reuse.software/badge/github.com/cap-js/cds-typer)](https://api.reuse.software/info/github.com/cap-js/cds-typer)
![Unit Tests passing](https://github.com/cap-js/cds-typer/actions/workflows/test.yml/badge.svg)

## About this project

Generates `.ts` files for a CDS model to receive code completion in VS Code.

Exhaustive documentation can be found on [CAPire](https://cap.cloud.sap/docs/tools/cds-typer).

## Known Restrictions

Certain language features of CDS can not be represented in TypeScript.
Trying to generate types for models using these features will therefore result in incorrect or broken TypeScript code.

### Changing Types

While the following is valid CDS, there is no TypeScript equivalent that would allow the type of an inherited property to change (TS2416).

```cds
entity A {
  foo: Integer
};

entity B: A {
  foo: String
}
```

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/cap-js/cds-typer/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/cap-js/.github/blob/main/CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright 2022-2022 SAP SE or an SAP affiliate company and cds-typer contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/SAP/cds-dts-generator).
