using {imported_enum as schema} from './schema';


entity EntityWithRefToEnum {
  e: schema.EnumExample
}

type TypeWithTransitiveRefToEnum {
  e: EntityWithRefToEnum:e
}

service ExampleService {
  define type EnumExample : schema.EnumExample;

  action test(val : EnumExample) returns String;
}