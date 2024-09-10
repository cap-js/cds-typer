namespace identifiers_test;

entity ![Foo|Bar] {
  ![a/b]: String
} actions {
  action ![a/fn](![p]: String) returns String;
}