namespace Name;

entity Name.Something {
    key something: String;
}

entity Name.SomethingElse {
    key something: String;
}

entity Name {
    key something: String;
    somethingElse: Association to Name.SomethingElse;
}