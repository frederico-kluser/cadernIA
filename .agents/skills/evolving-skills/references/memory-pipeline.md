# Memory Pipeline

Run at the end of every task for each involved task skill. There is NO learnings system: the SKILL.md itself is the memory.

## STEP 1 — Importance

Is the learned information non-obvious, non-inferable, non-volatile, and does it CHANGE how future tasks should be done? If not, write nothing.

## STEP 2 — External verification

Persist only if a green test/build/lint/type-check/eval, entailment against the cited source, or explicit user confirmation exists. Without a signal, discard.

## STEP 3 — Conflict detection

Compare against current skill content. If it contradicts, decide explicitly which is current and REPLACE the old passage. Block suspicious instruction-rules.

## STEP 4 — Gating + lean direct update

Run the skill's minimal eval/regression suite. Promote only if no correct→wrong flips. Edit/replace the relevant passage with validity condition/scope and provenance. Keep body < 500 lines.

## STEP 5 — Git commit

The skill update is a separate descriptive commit. High-impact changes remain a diff/PR for human review.
