using {
    cuid,
    sap.common.CodeList
} from '@sap/cds/common';


namespace inl_comp;

entity Genres : CodeList {
    key code : String enum {
            Fiction;
        }
}

@singular: 'PEditor'
@plural  : 'PEditors'
aspect Editors : cuid {
    name : String;
}


@singular: 'Bestseller'
@plural  : 'Bestsellers'
entity Books : cuid {
    title      : String;
    genre      : Association to Genres;
    publishers : Composition of many {
                     key ID         : UUID;
                         name       : String;
                         type       : String enum {
                             self;
                             independent;
                         };
                         // will get inflections from aspect
                         intEditors : Composition of many Editors;
                         // will get inflections from aspect
                         extEditors : Composition of many Editors;
                         offices    : Composition of many {
                                          key ID      : UUID;
                                              city    : String;
                                              zipCode : String;
                                              size    : String enum {
                                                  small;
                                                  medium;
                                                  large;
                                              }
                                      }
                 }
}

// overwrite annotations from aspect to avoid name duplicates
annotate Books.publishers.extEditors with @singular: 'EEditor'
                                          @plural  : 'EEditors';


service CatService {
    // autoexposed inline compositions will have the same names as in the schema
    entity Books as projection on inl_comp.Books;
}
