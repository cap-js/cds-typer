namespace excluding_test;

entity Foo {}

entity TestObjects {
    key ID: UUID;
    name: String not null;
    description: String;
    dependencies: Association to many Foo;
}

service TestService {
    entity SlimTestObjects as projection on TestObjects excluding { dependencies };
}