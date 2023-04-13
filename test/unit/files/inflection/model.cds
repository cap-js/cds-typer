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

@UI.HeaderInfo.TypeName: 'OneD'
@UI.HeaderInfo.TypeNamePlural: 'ManyDs'
@singular: 'OneSingleD'
entity D {

}