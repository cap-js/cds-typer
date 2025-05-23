namespace actions_test;
using elsewhere.ExternalType from './elsewhere';
using elsewhere.ExternalType2 from './elsewhere';
using ExternalInRoot from './root';

entity Foo {
    bar: Integer;
}

service S {
    action withBuiltInType (timestamp: Timestamp);
    entity E {
        key e1:String
    } actions {
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

    action   aMandatoryParam(
        val1: E not null,
        val2: array of E not null,
        opt: E,
    ) returns E;

    /** the action */
    action aDocOneLine(/** v1 */val1: E, /** v1 */val2: E);

    /**
     * the
     * action
     */
    action aDocMoreLinesWithBadChar(
        /**
         * line1
         * line2 *\/
         */
        val: E
    );

    action aRfcStyle(
        INPUT : String(1) not null,
        @RFCParameterType : 'Table'
            TABLES : many ExternalType2,
        @RFCParameterType : 'Export'
            EXPORT: String(1)
    ) returns ExternalType;
}

action free (param: String) returns { a: Integer; b: String } ;
action free2 () returns ExternalType;
action free3 () returns ExternalInRoot;
action freevoid ();
action freetypeof (p: Foo:bar);

action free4 () returns {
    foo: ExternalType2
};

entity NoActions {key id: Integer;}
entity ParameterlessActions {key id: Integer;}
    actions {
        action a()
    }

service S2 {
    entity E {key id: Integer;};
    action a1 (p1: String, p2: many ExternalType2) returns ExternalType;
    action a2 (p1: String not null, p2: many ExternalType2, p3: Integer not null) returns ExternalType
}

entity Parent {}
    actions {
        action a()
    }

entity Child: Parent {}
    actions {
        action b()
    }

action actionWithMandatoryParameter( @mandatory parameter : String);
