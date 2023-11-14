namespace inflection;

entity Gizmos {

}

@singular: 'FooSingular'
entity Foos {}

@plural: 'BarPlural'
entity Bars {

}

@singular: 'BazSingular'
@plural  : 'BazPlural'
entity Bazes {

}

@UI.HeaderInfo.TypeName      : 'OneA'
@UI.HeaderInfo.TypeNamePlural: 'ManyAs'
entity A {

}

@UI.HeaderInfo.TypeName      : 'OneC'
@UI.HeaderInfo.TypeNamePlural: 'ManyCs'
@plural                      : 'LotsOfCs'
entity C {

}

@UI.HeaderInfo.TypeName      : 'OneD'
@UI.HeaderInfo.TypeNamePlural: 'ManyDs'
@singular                    : 'OneSingleD'
entity D {

}

entity Referer {
    // annotated
    a : Association to Bazes not null;
    b : Association to many Bazes;
    c : Composition of Bazes not null;
    d : Composition of many Bazes;
    // automatically inferred
    e : Association to Gizmos not null;
    f : Association to many Gizmos;
    g : Composition of Gizmos not null;
    h : Composition of many Gizmos;
}
