using {cuid} from '@sap/cds/common';
using {Publishers as p} from './nonamespace';

namespace bookshop;

service CatalogService {
    entity Books : cuid {
        title : String;
        genre : String enum {
            Fantasy = 'Fantasy';
            SciFi   = 'Science-Fiction'
        }
    };

    entity Publishers as projection on p;
}
