namespace events;

entity Foo {
    name: String;
}

event Bar: { id: Integer; name: Foo:name };