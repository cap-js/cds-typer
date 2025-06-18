namespace aspect_test;

aspect Persons {}

entity Authors: Persons {}
entity Catalog {
    key ID: Integer;
    persons: Composition of Persons;
}