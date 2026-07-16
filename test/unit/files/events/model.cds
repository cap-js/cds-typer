namespace events;

entity Foo {
  name : String;
}

event Bar : {
  id        : Integer;
  name      : Foo:name;
  createdOn : Timestamp;
};

service MyService {
  event OrderPlaced : {
    id : Integer;
  };
  event Scoped.OrderPlaced : {
    id : Integer;
  };
  event Deeply.Scoped.OrderPlaced : {
    id : Integer;
  };
}

