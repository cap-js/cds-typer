---
name: Bug report
about: Please fill out all sections that are applicable to your bug, remove sections
  that are not relevant for your case.
title: "[BUG]"
labels: ''
assignees: ''

---

## Describe the bug and additional context
A clear and concise description of what the bug is. Also add any other context about the problem here.


## Details

**Versions of CDS tools[^3]:**
**Version of `cds-typer`[^1]:**
**Repository[^2]:**



## Sample CDS
(Excerpt of a) model that causes the issue. For example:

```cds
entity Foo {
  bar: String;
  baz: Integer;
}
```

[^1]: You can acquire the version of `cds-typer` you are using by executing: `npx cds-typer --version`
[^2]: A repository to your project where the problem manifests (including the relevant branch).
[^3]: These versions can be acquired by running `cds v -i`. May not apply to you, in that case just leave it blank.
