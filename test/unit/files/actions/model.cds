namespace actions_test;
using elsewhere.ExternalType from './elsewhere';
using elsewhere.ExternalType2 from './elsewhere';
using ExternalInRoot from './root';

service S {
    entity E {}
        actions {
            action f (x: String);
            function g (a: { x: Integer; y: Integer }, b: Integer) returns Integer;
            action h () returns { a: Integer; b: String };
            action k () returns ExternalType;
            action l () returns ExternalInRoot;
            action s1 (x: $self);
            action sn (x: many $self);
        }
}

action free (param: String) returns { a: Integer; b: String } ;
action free2 () returns ExternalType;
action free3 () returns ExternalInRoot;

action free4 () returns {
    foo: ExternalType2
};