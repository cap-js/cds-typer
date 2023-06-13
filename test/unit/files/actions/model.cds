namespace actions_test;

service S {
    entity E {}
        actions {
            action f (x: String);
            function g (a: { x: Integer; y: Integer }, b: Integer) returns Integer;
            action h () returns { a: Integer; b: String };
        }
}

action free (param: String) returns { a: Integer; b: String } ;