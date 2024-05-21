namespace inheritance;

using { ExtE, ExtT } from './elsewhere';

entity A {}

entity B {}

type T {}

entity LeafEntity : A, B, T, ExtE, ExtT {}
type LeafType : A, B, T, ExtE, ExtT {}

// ends with an "s" - explicit in annotation
@singular: 'Circus'
@plural  : 'Circuses'
entity Circus {
    key Id   : UUID;
    Name : String;
};

// ends with "s" - inferred from name
entity Abyss {
    key Id   : UUID;
    Name : String;
};