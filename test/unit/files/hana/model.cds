namespace hanatypes;

entity Everything {
    bar: String;
    smallint: cds.hana.SMALLINT;
    tinyint: cds.hana.TINYINT;
    smalldecimal: cds.hana.SMALLDECIMAL;
    real: cds.hana.REAL;  
    char: cds.hana.CHAR;
    nchar: cds.hana.NCHAR;
    varchar: cds.hana.VARCHAR;
    clob: cds.hana.CLOB;
    binary: cds.hana.BINARY;
    point: cds.hana.ST_POINT;
    geometry: cds.hana.ST_GEOMETRY;
    shorthand: hana.REAL;
}