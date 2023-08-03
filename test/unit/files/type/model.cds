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