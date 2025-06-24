namespace imported_enum;

type EnumExample : String enum {
  ONE = 'ONE';
  TWO;
}

entity EntityWithEnum {
  key ID: Integer;
  inline: String enum {
    ONE = 'ONE';
    TWO;
  }
}