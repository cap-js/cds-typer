namespace aspect_test;

aspect Status {
    status: String enum {
        Started;
        Done;
    } default #Started not null;
}

aspect InlineStatus {
    inlineStatus: String enum {
        Active;
    } default #Active not null;
}

entity Applications: Status, InlineStatus {
    key ID: Integer;
}
