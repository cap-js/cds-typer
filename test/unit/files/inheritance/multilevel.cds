namespace multilevel_inheritance;

aspect A1 {
  property1 : String(10) not null;
}

aspect A2: A1 {
  property2 : String(20) not null;
}

entity E : A2 {
    key ID : UUID not null;
}