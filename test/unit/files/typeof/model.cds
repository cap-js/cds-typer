using { external } from './external';
namespace typeof;

//type T: { s: String };
entity Foo {
    a: String;
    b: Integer;
    c: {
        x: String;
    };
    key k: Integer;
}

entity Bar {
    ref_a: Foo:a;
    ref_b: Foo:b;
    ref_c: Foo:c.x;
    ref_k: Foo:k;
};

entity Baz {
    ref: external.Issues:status
}