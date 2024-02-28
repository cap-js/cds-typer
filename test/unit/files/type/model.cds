namespace type_test;
type IntAlias: Integer;
type Points: { x: Integer; y: Integer }
type Lines: Array of Points;

entity Persons {
    id: IntAlias;
    pos: Points;
    history: Array of Points;
    line: Lines;
}

function fn() returns OuterType;

type OuterType {
    inner: InnerType;
}

type InnerType {
    x : array of String;
}