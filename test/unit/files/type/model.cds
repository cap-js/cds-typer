namespace type_test;
type IntAlias: Integer;
type Points: { x: Integer; y: Integer }
type Lines: Array of Points;

entity Persons {
    id: IntAlias;
    pos: Points;
    history: Array of Points;
    line: Lines;
};

entity Wrapper {
    e: String enum { a; b; }
}

type Ref: Wrapper:e;