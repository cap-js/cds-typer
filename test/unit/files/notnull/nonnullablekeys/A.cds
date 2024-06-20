using { cuid } from '@sap/cds/common';

namespace ns;

entity A: cuid {}

entity B { x: Association to A; };