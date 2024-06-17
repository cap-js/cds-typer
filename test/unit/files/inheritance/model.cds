namespace inheritance;

using { ExtE, ExtT } from './elsewhere';

entity A {}

entity B {}

type T {}

entity LeafEntity : A, B, T, ExtE, ExtT {}
type LeafType : A, B, T, ExtE, ExtT {}
