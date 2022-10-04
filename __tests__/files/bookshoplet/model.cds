namespace sap.capire.bookshop;

entity Books {
  key ID : Integer;
  title  : localized String(111);
  descr  : localized String(1111);
  author : Association to Authors;
  genre  : Association to Genres;
  stock  : Integer;
  price  : Decimal;
  currency : Decimal;
  image : LargeBinary @Core.MediaType : 'image/png';
}

entity Authors {
  key ID : Integer;
  name   : String(111);
  dateOfBirth  : Date;
  dateOfDeath  : Date;
  placeOfBirth : String;
  placeOfDeath : String;
  books  : Association to many Books on books.author = $self;
}

/** Hierarchically organized Code List for Genres */
entity Genres {
  key ID   : Integer;
  parent   : Association to Genres;
  children : Composition of many Genres on children.parent = $self;
}

entity A {
  x: Integer;
}

entity B {
  x: String;
}

entity C {
  x: Boolean;
}

entity D {} //: A,B,C{}

entity E { //D{
  y: Integer;
} 