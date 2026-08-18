namespace inline_enum_type_schema;

type NumberRestriction {
    restrictionType : String enum {
        Number = 'NU';
        Between = 'BT';
    };
    unit : String enum {
        None = 'NONE';
        Currency = 'CURR';
    };
}
