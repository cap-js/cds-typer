using { cuid } from '@sap/cds/common';

namespace references;

entity Foo: cuid {  // inherits an additional key ID
    key first_key: UUID;
    key second_key: String;
}

entity Bar {
    key id: Integer;  // required for composition of many ... to work.
    assoc_one: Association to one Foo;
    assoc_many: Association to many Foo;
    comp_one: Composition of one Foo;
    comp_many: Composition of many Foo;
    // inline structs (only composition is allowed for structs)
    inl_comp_one: Composition of { a: String; key ID: UUID };
    inl_comp_many: Composition of many { a: String; };
};