# Architecture Decision Record (ADR): [Title]

**Status:** Proposed → Accepted → Deprecated → Superseded  
**Date:** YYYY-MM-DD  
**Deciders:** [Names of people involved in decision]  
**Consulted:** [Names of people consulted]  
**Informed:** [Names of people informed]  

Technical Story: [Description of issue or context, ticket/issue numbers if applicable]

---

## Context and Problem Statement

[Describe the context and problem statement, e.g., in free form using two to three sentences. You may want to articulate the problem in form of a question.]

## Decision Drivers

* [driver 1, e.g., a force, facing concern, …]
* [driver 2, e.g., a force, facing concern, …]
* … <!-- numbers of drivers can vary -->

## Considered Options

* [option 1]
* [option 2]
* [option 3]
* … <!-- numbers of options can vary -->

## Decision Outcome

Chosen option: "[option 1]", because [justification. e.g., only option which meets k.o. criterion decision driver | which resolves force force | … | comes out best (see below)].

### Positive Consequences

* [e.g., improvement of quality attribute satisfaction, follow-up decisions required, …]
* …

### Negative Consequences

* [e.g., compromising quality attribute, follow-up decisions required, …]
* …

## Pros and Cons of the Options

### [Option 1]

[example | description | pointer to more information | …] <!-- optional -->

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* … <!-- numbers of pros and cons can vary -->

### [Option 2]

[example | description | pointer to more information | …] <!-- optional -->

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* … <!-- numbers of pros and cons can vary -->

### [Option 3]

[example | description | pointer to more information | …] <!-- optional -->

* Good, because [argument a]
* Good, because [argument b]
* Bad, because [argument c]
* … <!-- numbers of pros and cons can vary -->

## Validation

[Describe how the decision was validated or how the implementation confirms that the decision is successful. Include links to test results, performance benchmarks, or other validation evidence.]

## Follow-up Actions

- [ ] [Action item 1] - Owner: [Name] - Due: [Date]
- [ ] [Action item 2] - Owner: [Name] - Due: [Date]
- [ ] …

## Notes

[Any additional notes, references, links to discussions, meeting notes, etc.]

## Change Log

| Date | Version | Status | Description | Author |
|------|---------|--------|-------------|--------|
| YYYY-MM-DD | 1.0 | Proposed | Initial proposal | [Name] |
| YYYY-MM-DD | 1.0 | Accepted | Approved in architecture review | [Name] |
| YYYY-MM-DD | 1.1 | Accepted | Updated with validation results | [Name] |

---

# Example ADR

Below is a filled-out example to guide you:

---

# ADR 042: Use PostgreSQL as Primary Database

**Status:** Accepted  
**Date:** 2024-01-15  
**Deciders:** Jane Smith (Architect), John Doe (Tech Lead), Bob Wilson (DBA)  
**Consulted:** Engineering Team, DevOps Team  
**Informed:** Product Management  

Technical Story: We need to select a primary database for the new customer management system that supports ACID transactions, has good performance characteristics, and can scale to our projected growth.

---

## Context and Problem Statement

We need to choose a primary database for our customer management system. The system requires strong consistency for financial transactions, complex querying capabilities for reporting, and must support our projected growth to 10M+ customers over 3 years.

Key requirements:
- ACID compliance for payment processing
- Complex JOIN queries for reporting
- JSON support for flexible customer attributes
- Proven scalability and reliability
- Strong operational tooling

## Decision Drivers

* Data consistency is critical for financial operations (k.o. criterion)
* Team has strong SQL/relational database experience
* Need for complex reporting queries
* Cost efficiency at scale
* Operational simplicity

## Considered Options

* PostgreSQL 15
* MySQL 8.0
* MongoDB 6.0
* Amazon Aurora PostgreSQL

## Decision Outcome

Chosen option: "PostgreSQL 15 self-managed on EC2", because it meets all our requirements at the best cost/operational simplicity trade-off for our current scale.

### Positive Consequences

* ACID compliance ensures data integrity for financial transactions
* Rich feature set (JSONB, full-text search, window functions) covers current and future needs
* Strong operational tooling and monitoring
* Team can leverage existing SQL expertise
* Cost-effective at current scale ($X/month vs $Y for managed alternatives)
* Can migrate to Aurora later if needed without application changes

### Negative Consequences

* Operational burden for backups, patching, replication
* Manual scaling procedures (vs auto-scaling in managed services)
* Need to invest in DBA expertise or automation
* Replication setup and maintenance overhead

## Pros and Cons of the Options

### PostgreSQL 15 (Self-Managed)

* Good, because ACID compliant and battle-tested for financial data
* Good, because Advanced JSONB support for flexible schema needs
* Good, because Best-in-class query optimizer for complex reports
* Good, because Rich ecosystem and tooling
* Good, because Lower cost at current scale
* Bad, because Operational overhead (backups, patching, monitoring)
* Bad, because Need in-house DBA expertise
* Bad, because Manual scaling procedures

### MySQL 8.0

* Good, because ACID compliant with InnoDB
* Good, because Wide adoption and familiarity
* Good, because Good replication story
* Bad, because Less advanced query optimizer for complex analytics
* Bad, because JSON support less mature than PostgreSQL
* Bad, because Team has less MySQL experience

### MongoDB 6.0

* Good, because Schema flexibility for evolving customer data
* Good, because Horizontal scaling built-in
* Good, because Document model matches object-oriented code
* Bad, because No ACID transactions across collections (k.o. criterion)
* Bad, because Complex aggregation for reporting
* Bad, because Team has limited NoSQL experience
* Bad, because Eventual consistency not acceptable for financial data

### Amazon Aurora PostgreSQL

* Good, because Fully managed, reduces operational burden
* Good, because PostgreSQL compatible (easy migration path)
* Good, because Auto-scaling and high availability
* Good, because Automated backups and patching
* Bad, because 3x cost of self-managed at current scale
* Bad, because AWS lock-in concerns
* Bad, because Overkill for current scale (can migrate later)

## Validation

Load testing confirms PostgreSQL can handle projected load:
- 10,000 concurrent connections: ✅
- 5,000 writes/sec sustained: ✅
- Complex report query (< 2s): ✅
- Failover time (< 30s): ✅

Test results: [link to performance test report]

## Follow-up Actions

- [ ] Set up automated backup and PITR (Point-in-Time Recovery) - Owner: DevOps - Due: 2024-02-01
- [ ] Implement monitoring and alerting for database health - Owner: DevOps - Due: 2024-02-01
- [ ] Create runbook for failover procedures - Owner: DBA - Due: 2024-02-15
- [ ] Evaluate Aurora migration path for year 2 - Owner: Architect - Due: 2024-12-01

## Notes

- Decision reviewed and approved in Architecture Review Board meeting on 2024-01-15
- Team discussed at engineering all-hands on 2024-01-18
- Plan to re-evaluate managed database options when we reach 1M customers

## Change Log

| Date | Version | Status | Description | Author |
|------|---------|--------|-------------|--------|
| 2024-01-10 | 0.1 | Proposed | Initial proposal with options | Jane Smith |
| 2024-01-15 | 1.0 | Accepted | Approved with follow-up actions | Jane Smith |
| 2024-01-20 | 1.1 | Accepted | Added validation test results | John Doe |
