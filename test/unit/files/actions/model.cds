namespace actions_test;
using elsewhere.ExternalType from './elsewhere';
using elsewhere.ExternalType2 from './elsewhere';
using ExternalInRoot from './root';

entity Foo {
    bar: Integer;
}

service S {
    entity E {}
        actions {
            action f (x: String);
            function g (a: { x: Integer; y: Integer }, b: Integer) returns Integer;
            action h () returns { a: Integer; b: String };
            action k () returns ExternalType;
            action l () returns ExternalInRoot;
            action s1 (in: $self);
            action sn (in: many $self);
            action sx (in: $self, x: Int16);
        }
    function getOneExternalType() returns ExternalType;
    function getManyExternalTypes() returns array of ExternalType;

    function fSingleParamSingleReturn(val: E)        returns E;
    function fSingleParamManyReturn(val: E)          returns array of E;
    function fManyParamManyReturn(val: array of E)   returns array of E;
    function fManyParamSingleReturn(val: array of E) returns E;
    // actions
    action   aSingleParamSingleReturn(val: E)        returns E;
    action   aSingleParamManyReturn(val: E)          returns array of E;
    action   aManyParamManyReturn(val: array of E)   returns array of E;
    action   aManyParamSingleReturn(val: array of E) returns E;

    action   aOptionalParam(
        val: E,
        @Core.OptionalParameter: {$Type : 'Core.OptionalParameterType'}
        opt: E
    ) returns E;
}

action free (param: String) returns { a: Integer; b: String } ;
action free2 () returns ExternalType;
action free3 () returns ExternalInRoot;
action freevoid ();
action freetypeof (p: Foo:bar);

action free4 () returns {
    foo: ExternalType2
};

entity NoActions {}
entity ParameterlessActions {}
    actions {
        action a()
    }