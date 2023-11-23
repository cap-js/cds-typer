namespace typeof;

//type T: { s: String };
entity Foo {
    a: String;
    b: Integer;
    c: {
        x: String;
    }
}

entity Bar {
    ref_a: Foo:a;
    ref_b: Foo:b;
    ref_c: Foo:c.x;
};