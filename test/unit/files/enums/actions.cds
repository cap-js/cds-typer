type EnumFoo: String enum {
  foo = 'FOO';
  bar
}

entity Foobar {} actions {
  action f(p: String enum {
    A;
    B = 'b'
  });
  action g(p: EnumFoo);
};
