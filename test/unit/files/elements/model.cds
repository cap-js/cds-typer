namespace elements_test;

aspect A1 {
    A_f1 : String;
    A_f2 : String;
}

entity E1 {
    key ID: Integer;
    a : String;
    b : Integer;
}

entity E2 : A1 {
    key ID: String;
    d: Integer;
}

entity P1 as projection on E2;