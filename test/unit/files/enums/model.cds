namespace enums_test;

/** Gender */
type Gender : String enum { male; female; non_binary = 'non-binary'; }

/** Truthy */
type Truthy : Boolean enum { yes = true; no = false; yesnt = false; catchall = 42 }

/** Status */
type Status : Integer enum {
    submitted =  1;
    unknown = 0;
    cancelled  = -1;
}
type TypeWithInlineEnum {
    inlineEnumProperty: String enum {
        foo; bar
    }
}

entity InlineEnums {
    /** gender */
    gender: String enum {
        male;
        female;
        non_binary = 'non-binary';
    };
    /** status */
    status : Integer enum {
        submitted =  1;
        fulfilled =  2;
        shipped   =  42;
        canceled  = -1;
    };
    /** bool */
    yesno: Boolean enum {
        yes = true;
        no = false;
        yesnt = false;
        catchall = 42;
    };
}

/**
 * entity with enums
 */
entity ExternalEnums {
    status : Status;
    gender: Gender;
    yesno: Truthy;
}

entity ReferingType {
    gender: type of InlineEnums : gender
}
