namespace typeof;

//type T: { s: String };
entity Foo {
    a : String not null;
    b : Integer not null;
    c : {
        x : String not null;
    }
}

entity Bar {
    ref_a : Foo:a;
    ref_b : Foo:b;
    ref_c : Foo:c.x;
};
