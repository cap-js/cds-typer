using { enum_association_key } from './schema';

service CatalogService {
    entity Books as projection on enum_association_key.Books;
}
