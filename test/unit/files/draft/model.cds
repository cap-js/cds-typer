namespace draft_test;

@odata.draft.enabled
entity A {}
entity B: A {}
@odata.draft.enabled: false
entity C: B {}
entity D: C {}
@odata.draft.enabled: true
entity E: D {}
entity F: C,E {}
entity G: E,C {}

// don't become draftable
entity H { ref: Association to A }
entity I { ref: Association to many A }
// should not become draftable
entity J { ref: Composition of A }
entity K { ref: Composition of many A }

// should not
entity L { ref: Composition of C }
entity M { ref: Composition of many C }

@odata.draft.enabled: true
entity N { ref: Composition of many O }
// ! should be enabled 
entity O {}

@odata.draft.enabled: true
entity P { ref: Association to C }
@odata.draft.enabled: false
entity Q { }
@odata.draft.enabled: true
entity R { ref: Composition of Q }

entity PA as projection on A {}

// propagate from projection to referenced entity
entity Referenced {}
entity Referrer {
    ref: Association to Referenced
}
@odata.draft.enabled: true
entity ProjectedReferrer as projection on Referrer {}

// propagate over two levels of projection
entity Foo {}
entity ProjectedFoo as projection on Foo {}
@odata.draft.enabled: true
entity ProjectedProjectedFoo as projection on ProjectedFoo {}