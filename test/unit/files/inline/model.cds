namespace inline;

//type T: { s: String };
entity Foo {}

entity Bar {
    x : {
        a     : {
            b : Integer not null;
            c : Association to one Foo not null;
        } not null;
        y     : String not null;
    } not null;
};
