using {
    cuid,
    sap.common
} from '@sap/cds/common.cds';

namespace localized_model;

entity Books : cuid {
    title      : localized String;
    authorName : String;
}

entity ProjectedCurrencies as select from common.Currencies;
