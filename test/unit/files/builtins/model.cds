namespace builtins;

entity E {
    uuid      : UUID not null;
    str       : String not null;
    bin       : Binary not null;
    lstr      : LargeString not null;
    lbin      : LargeBinary not null;
    integ     : Integer not null;
    uint8     : UInt8 not null;
    int16     : Int16 not null;
    int32     : Int32 not null;
    int64     : Int64 not null;
    integer64 : Integer64 not null;
    dec       : Decimal not null;
    doub      : Double not null;
    d         : Date not null;
    dt        : DateTime not null;
    ts        : Timestamp not null;
}
