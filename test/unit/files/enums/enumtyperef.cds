// https://github.com/cap-js/cds-typer/issues/171
namespace enumtyperef;

entity EnumTypeOf {
    str: String;
}
  
service EnumsInActions {
    action EnumInParamAndReturn(Param: EnumTypeOf:str enum { a; }) returns EnumTypeOf:str enum { b; };
}