namespace bookshop;

type User : String(255);
aspect cuid { key ID : UUID; }
aspect managed {
  createdAt  : Timestamp @cds.on.insert : $now;
  createdBy  : User      @cds.on.insert : $user;
  modifiedAt : Timestamp @cds.on.insert : $now  @cds.on.update : $now;
  modifiedBy : User      @cds.on.insert : $user @cds.on.update : $user;
}

entity Books : managed, cuid {
  title      : String;
  publishers : Composition of many Publishers
                on publishers.book = $self;
}

entity Publishers : managed, cuid {
  name : String;
  book : Association to Books;
}