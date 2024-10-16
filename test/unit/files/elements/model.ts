import cds from '@sap/cds'
import { E1, E2, P1 } from '#cds-models/elements_test'

E1.elements
E1.elements.ID
E1.elements.a
E1.elements.b
// @ts-expect-error
E1.elements.nonExistent

E2.elements
E2.elements.d    // from entity E1
E2.elements.A_f1 // from aspect A1

// check projection
P1.elements
P1.elements.ID
P1.elements.d
P1.elements.A_f1
P1.elements.A_f2

// check LinkedDefinitions types
E1.elements.a.type
E1.elements.a.kind
E1.elements.a.items
E1.elements.a instanceof cds.builtin.classes.String