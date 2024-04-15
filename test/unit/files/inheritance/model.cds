namespace inheritance;

using { ExtE, ExtT } from './elsewhere';

entity A {}

entity B {}

type T {}

entity C : A, B, T, ExtE, ExtT {}
