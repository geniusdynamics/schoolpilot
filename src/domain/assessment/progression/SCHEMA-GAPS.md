<!-- ABOUTME: The pack-schema fields the annual aggregator and progression evaluator can express but -->
<!-- ABOUTME: `packs/schema/assessment.schema.json` and `progression.schema.json` cannot declare. -->

# Schema gaps found by P2-B04

The evaluator accepts each form below; a pack cannot declare it yet. P2-A01a is revising the
schemas in parallel, so this file records the exact field and the reason.

## assessment.json `annual`

| Gap | Field needed | Why | Current evaluator form |
| --- | --- | --- | --- |
| No annual rounding | `annual.precision`, `annual.mode` | Spec 03 section 4 says rounding is declared at each stage, and `roundingRule.stage` names `annual`, but `annualAggregation` is closed and has no rounding field. | `AnnualDefinition.precision` / `mode`; one `round` step is recorded in the trace. |
| No annual scale | `annual.grading_scale` | A named aggregation such as `annual.gcse_points_total` consumes grade points, so the annual area results need the scheme's band lookup. The annual block spans every scheme and cannot name the scale. | `AnnualContext.grading_scale`; the caller passes the scheme's scale. |
| Weights are JSON numbers | exact decimal or fraction strings in `annual.of` | `weight` is a number capped at 0..1, so a third cannot be written exactly and still sum to 1. | `AnnualDefinition.of` accepts exact strings such as `1/3`. |
| `best_of` has no combine rule | `annual.then` (`mean` or `sum`) | The schema says how many periods count but not whether they are averaged or added. The evaluator averages them so the annual result keeps the period scale. | Fixed `mean`; documented in `types.ts` and the trace. |
| `final_period_only` does not name its period | `annual.of` required, or `annual.period` | "Final" is otherwise the last declared period (or the last input), which is an ordering convention rather than a declaration. | `of` order; the `value` step records the selected period and every period it ignored. |

## progression.json

| Gap | Field needed | Why | Current evaluator form |
| --- | --- | --- | --- |
| `requires` is a closed enum | open list, or a pack-declared requirement catalog | Only `national_assessment_recorded` and `pathway_placement` can be declared. A pack needing another record is rejected by the schema. | Any non-empty requirement name is accepted; an absent name is unmet. |
| Graduation has no requirements | `graduation[].requires` | A terminal level can require a national assessment or clearance before graduation, but `graduationRule` has no field for it. | Not expressible; graduation is unconditional. |
| Conditions have only `gte` | `gt`, `lte`, `lt`, `eq`, or ranges | Threshold and council rules can only state a lower bound. | Only `gte` is evaluated. |
| One council suggestion metric | `suggest` as a list, or a condition list | A council may weigh several metrics; the schema allows one. | One suggestion condition. |
| No default rule | `levels: ["*"]` or a `default` rule | A level added to a pack after release has no rule; the evaluator refers it to the council with a `no_rule` flag rather than dropping the learner. | Defensive `council` + `no_rule`. |
| No exact threshold string | `condition.gte` as a decimal string | Exact fractions cannot be written as JSON numbers without losing the value. | `ProgressionConditionDefinition.gte` accepts a string. |

## Engine gap (P2-B03), not a schema gap

`assessment.schema.json` allows `sum_points` without `result_scale`, and the shipped
`gb-national`, `cambridge-intl` and `pearson-intl` packs declare `gcse_points_total`,
`igcse_points_total` and `ucas_tariff` that way. `prepareAggregation` refuses every
`sum_points` definition without a `result_scale` (`missing_result_scale`), so
`annual.<aggregation>` cannot resolve those three class-council suggestion metrics through the
aggregation engine. The evaluator does not fork the operator: it returns an `unknown` metric with
reason `aggregation_rejected` and issue `missing_result_scale`, and a caller-supplied metric can
fill the gap. The engine needs either to accept a points total without a lookup scale or the
packs need a declared scale for their point totals.
