namespace inline;

//type T: { s: String };
entity Foo {}

entity Bar {
    x: {
        a: {
            b: Integer;
            c: Association to one Foo
        };
        y: String;
    };
};