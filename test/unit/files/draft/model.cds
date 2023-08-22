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

// should become draftable
entity H { ref: Association to A }
entity I { ref: Association to many A }
entity J { ref: Composition of A }
entity K { ref: Composition of many A }

// should not
entity L { ref: Association to C }
entity M { ref: Association to many C }
entity N { ref: Composition of C }
entity O { ref: Composition of many C }

@odata.draft.enabled: true
entity P { ref: Association to C }
@odata.draft.enabled: false
entity Q { ref: Association to A }