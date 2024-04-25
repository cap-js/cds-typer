// specifically needs its own model, as we are referring to cuid
using { cuid } from '@sap/cds/common';

namespace ns;

entity A: cuid {}

entity B {  };