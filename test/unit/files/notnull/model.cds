namespace not_null;

entity Foo {}

entity E {
    x: Integer not null;
    foo_assoc: Association to Foo not null;
    foos_assoc: Association to many Foo not null;
    foo_comp: Composition of Foo not null;
    foos_comp: Composition of many Foo not null;
    inline: {
        a: Integer not null
    } not null
}
    actions {
        action f (x: String not null);
    }

action free (param: String not null) returns Integer not null;