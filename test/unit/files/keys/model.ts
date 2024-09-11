import { C } from '#cds-models/keys_test'

C.keys  // .keys present
C.keys.a  // inherited from A
// @ts-expect-error - non-key not inherited
C.keys.b
C.keys.e2 // inherited from E2
C.keys.c  // own key
// @ts-expect-error - own non-key property not contained in .keys
C.keys.d 
new C().c.toLowerCase()  // still a regular string
// @ts-expect-error - Symbol marker not accessible
new C().c.key
