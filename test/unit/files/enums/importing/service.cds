using {imported_enum as schema} from './schema';

entity ProjectedEntity as projection on schema.EntityWithEnum;

type TypeReferringToProjectedEntity {
  foo: ProjectedEntity:inline;
}

service ExampleService {
  define type EnumExample : schema.EnumExample;

  action test(val : EnumExample) returns String;
}