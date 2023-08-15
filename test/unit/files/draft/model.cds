namespace draft_test;

@odata.draft.enabled
entity A {}
entity B: A {}
@odata.draft.enabled: false
entity C: B {}
entity D: C {}