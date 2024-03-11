entity Foo {
    retainMeOnce: Integer;
    retainMeTwice: Integer;
    removeMe: Integer;
};

entity FooView as 
    SELECT 
        retainMeOnce AS removeMeNext,
        retainMeTwice AS retainMeOnceMore
    FROM 
        Foo
;

entity FooViewProjection as
    projection on FooView {
        retainMeOnceMore as Retained
    };

entity A {
    key ID: UUID;
    x: Composition of {
        y: String;
    }
}

entity B as projection on A.x;