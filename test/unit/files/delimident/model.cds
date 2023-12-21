namespace delimited_identifiers_test;

entity Foo {
    ![sap-icon://a]: String;
    ![sap-icon://b]: {
        ![sap-icon://c]: String;
    };
    c: String enum {
        ![sap-icon://d]
    };
} actions {
    action ![sap-icon://f]()
}