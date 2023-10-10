namespace autoexpose_test;

@cds.autoexpose
entity Books {
    ID: UUID
}

entity Libraries {
    ID: UUID;
    books: Composition of many Books;
}