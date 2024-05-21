namespace inheritance;

using { ExtE, ExtT } from './elsewhere';

entity A {}

entity B {}

type T {}

entity LeafEntity : A, B, T, ExtE, ExtT {}
type LeafType : A, B, T, ExtE, ExtT {}

// ends with an "s"
@singular: 'Circus'
@plural  : 'Circuses'
entity Circus {
    key Id   : UUID;
    Name : String;
};