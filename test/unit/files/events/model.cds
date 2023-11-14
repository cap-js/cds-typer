namespace events;

entity Foo {
    name : String;
}

event Bar : {
    id   : Integer not null;
    name : Foo:name not null
};
