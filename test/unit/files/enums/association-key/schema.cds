namespace enum_association_key;

entity BookIDs {
    key ID : String enum {
        ID1;
        ID2;
    };
}

entity Books {
    key ID : Association to BookIDs;
    title  : String;
}
