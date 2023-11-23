namespace enums_test;

type Gender : String enum { male; female; non_binary = 'non-binary'; }
type Truthy : Boolean enum { yes = true; no = false; yesnt = false; catchall = 42 }
type Status : Integer enum {
    submitted =  1;
    unknown = 0;
    cancelled  = -1;
}

entity InlineEnums {
    gender: String enum { 
        male; 
        female; 
        non_binary = 'non-binary';
    };
    status : Integer enum {
        submitted =  1;
        fulfilled =  2;
        shipped   =  42;
        canceled  = -1;
    };
    yesno: Boolean enum {
        yes = true;
        no = false;
        yesnt = false;
        catchall = 42;
    };
}

entity ExternalEnums {
    status : Status;
    gender: Gender;
    yesno: Truthy;
}