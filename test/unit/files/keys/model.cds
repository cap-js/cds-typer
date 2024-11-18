namespace keys_test;

aspect A {
    key a: UUID;
    b: Integer;
}

entity E1 {
    key e1: Integer;
}

entity E2: E1 {
    key e2: Integer;
}

entity C: A, E2 {
    key c: String;
    d: Integer;
}

// mutual association, while also both extending cuid
using { cuid } from '@sap/cds/common';

entity Foo: cuid {
    bar: Association to Bar
}

entity Bar: cuid {
    foo: Association to Foo
}