namespace hanatypes;

entity Everything {
    bar          : String not null;
    smallint     : cds.hana.SMALLINT not null;
    tinyint      : cds.hana.TINYINT not null;
    smalldecimal : cds.hana.SMALLDECIMAL not null;
    real         : cds.hana.REAL not null;
    char         : cds.hana.CHAR not null;
    nchar        : cds.hana.NCHAR not null;
    varchar      : cds.hana.VARCHAR not null;
    clob         : cds.hana.CLOB not null;
    binary       : cds.hana.BINARY not null;
    point        : cds.hana.ST_POINT not null;
    geometry     : cds.hana.ST_GEOMETRY not null;
    shorthand    : hana.REAL not null;
}
