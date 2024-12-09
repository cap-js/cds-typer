namespace inflection;

entity Gizmos {

}

@singular: 'FooSingular'
entity Foos {
}

@plural: 'BarPlural'
entity Bars {

}

@singular: 'BazSingular'
@plural: 'BazPlural'
entity Bazes {

}

@UI.HeaderInfo.TypeName: 'OneA'
@UI.HeaderInfo.TypeNamePlural: 'ManyAs'
entity A {

}

@UI.HeaderInfo.TypeName: 'OneC'
@UI.HeaderInfo.TypeNamePlural: 'ManyCs'
@plural: 'LotsOfCs'
entity C {

}

entity CSub : C {}

@UI.HeaderInfo.TypeName: 'OneD'
@UI.HeaderInfo.TypeNamePlural: 'ManyDs'
@singular: 'OneSingleD'
entity D {

}

entity DSub : D {}

entity Referer {
    // annotated
    a: Association to Bazes;
    b: Association to many Bazes;
    c: Composition of Bazes;
    d: Composition of many Bazes;
    // automatically inferred
    e: Association to Gizmos;
    f: Association to many Gizmos;
    g: Composition of Gizmos;
    h: Composition of many Gizmos;
}