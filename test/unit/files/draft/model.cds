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