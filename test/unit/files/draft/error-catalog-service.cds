namespace bookshop.service;

using bookshop as my from './data-model';

service CatalogService {
    @odata.draft.enabled
    entity Books      as projection on my.Books;
    @odata.draft.enabled
    entity Publishers as projection on my.Publishers;
}