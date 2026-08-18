using { inline_enum_type_schema } from './schema';

service TestService {
    entity Questions {
        numberRestriction : inline_enum_type_schema.NumberRestriction;
    }
}
