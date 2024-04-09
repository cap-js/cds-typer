using {imported_enum as schema} from './schema';

service ExampleService {
  define type EnumExample : schema.EnumExample;

  action test(val : EnumExample) returns String;
}