namespace keys_test;

aspect A {
    key a: UUID;
    b: Integer;
}

entity E1 {
    key e1: Integer;
}

entity E2: E1 {
    key e2: Integer;
}

entity C: A, E2 {
    key c: String;
    d: Integer;
}