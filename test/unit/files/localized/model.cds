using {cuid} from '@sap/cds/common.cds';

namespace localized_model;

entity Books : cuid {
    title      : localized String;
    authorName : String;
}
