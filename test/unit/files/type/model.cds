namespace type_test;
type IntAlias: Integer;
type GeoData { latitude: Integer; longitude: Integer }
type Info {a: String;}
type Points: { x: Integer; y: Integer; geoData: GeoData; info: many Info }
type Lines: Array of Points;

entity Persons {
    id: IntAlias;
    pos: Points;
    history: Array of Points;
    line: Lines;
};

function fn() returns OuterType;

type OuterType {
    inner: InnerType;
}

type InnerType {
    x : array of String;
}

entity Wrapper {
    e: String enum { a; b; }
}

type Ref: Wrapper:e;
