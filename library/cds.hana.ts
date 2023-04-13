// cds-namespace: cds.hana
export class SMALLINT extends Number {};
export class TINYINT extends Number {};
export class SMALLDECIMAL extends Number {};
export class REAL extends Number {};
export class CHAR extends String {};
export class NCHAR extends String {};
export class VARCHAR extends String {};
export class CLOB extends String {};
export class BINARY extends String {}
export class ST_POINT {
    public x: number;
    public y: number;
}
export class ST_GEOMETRY { /* FIXME */ }
