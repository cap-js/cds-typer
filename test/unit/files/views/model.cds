namespace views_test;

entity Foo {
    id: Integer;
    code: String;
    flag: Boolean;
}

entity FooView as
    select from Foo {
        id,
        code,
        code as alias
    };

entity FooView2 as 
    select from Foo {
        *,
        id as id2
    };

aspect Bar {
    ID: UUID;
    bar: String    
}

entity Baz: Bar {
    baz: Int16
}

entity BazView as
    select from Baz {
        bar,
        baz,
        baz as ID  // typer has to properly handle this potential type clash between bar.ID and baz."ID"
    };