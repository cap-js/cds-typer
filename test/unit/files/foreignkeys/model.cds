namespace foreignkeys;

entity A {
    demo: String(100);
    key b : Association to B;
}

entity B {
  key c: Association to C;
  key d: Association to D;
}

entity C {
  key ID : String(100);
  key e: Association to E;
}

entity D {
  key ID : String(100);
}

entity E {
  key ID : String(100);
}