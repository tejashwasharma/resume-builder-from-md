# Panel feedback and practice plan

This chapter and the design cases after it were built from a real second-round rejection feedback by a Senior Software Engineer panel, so each case targets the exact things that panel graded. You do not need to memorize architectures. You need to learn a routine and practise it until it is automatic.

## What the panel actually grades

The panel's written feedback on a rejected candidate with strong Node.js and AWS experience was blunt: the gap "was not the absence of relevant technologies. It was the ability to translate those technologies into a well-reasoned system design."

| What they expect | What went wrong | What this book drills |
| --- | --- | --- |
| Requirements first | Jumped into the design without clarifying how the service works, what the quotas are, and what happens when they are exceeded | A question bank and a fixed requirements template in every chapter |
| Coherent architecture | Named SQS, Lambda, MySQL, Step Functions and cron, but not a design that hung together | One numbered diagram per system, with every path explained |
| Edge cases | No duplicate prevention, retries, quota exhaustion, tenant isolation, traffic spikes or downstream failure | A failure-mode table in every chapter |
| Justified choices | Cron jobs and Step Functions were called out as inappropriate and could not be defended | Every decision written as options, choice, why, trade-off |
| Senior judgment | Showed how to build with the tools, not what to build and why | A talk-track for driving the conversation |

The one-line difference between levels: a mid-level engineer knows how to implement a service with Node.js, SQS and Lambda. A senior engineer decides what should be built, how the components interact, what can go wrong, and why the architecture is the right choice.

## How every design case is laid out

1. **In brief and The prompt.** The problem exactly as an interviewer states it: vague on purpose.
2. **Step 1, Ask.** Questions to ask, why each matters, then the final functional and non-functional requirements and what is out of scope.
3. **Step 2, Numbers.** Back-of-envelope sizing, so the design is driven by load.
4. **Step 3, Architecture.** One diagram with numbered paths, then a walkthrough that explains each number.
5. **Step 4, Data model.** Schemas, keys, indexes, and which query each index serves.
6. **Step 5, Decisions.** Each key choice with the alternatives rejected.
7. **Edge cases, scaling, and how to drive the conversation.**
8. **Workshop and Quiz.** Interview questions, design variants, and a quiz.

## The design cases, in order

| Case | Content |
| --- | --- |
| Requirements playbook | How to turn a vague prompt into functional and non-functional requirements |
| Email service | The question the panel asked, designed end to end |
| E-commerce platform | One chapter: platform map, then deep dives on catalog and search, cart and checkout, inventory, orders, payments, fulfillment, plus scale |

For the routine itself, estimation and building blocks, use the chapters in the System design topic (the method, estimation, building blocks).

## Practice plan (three weeks)

| Week | Focus | Output |
| --- | --- | --- |
| 1 | The method chapter, the requirements playbook, then the email service | Redraw the email architecture from memory; explain it aloud in 40 minutes |
| 2 | E-commerce platform: map, then catalog, cart, inventory deep dives | Each chapter's design prompts attempted cold before reading the solution |
| 3 | E-commerce platform: orders, payments, fulfillment deep dives, scale | Two timed mock rounds; record yourself and check you spent the first five minutes only asking questions |

Rule for every practice session: **do not draw anything for the first five minutes.** Ask questions, write the answers down, state your assumptions, and only then design.

## Reference stack

| Need | Typical choice |
| --- | --- |
| Queue | SQS, Kafka |
| Counters and cache | Redis |
| Relational store | MySQL, PostgreSQL |
| Search | OpenSearch, Elasticsearch |
| Object storage | S3 |

## Quiz

### MCQ: According to the panel feedback, what was the core gap of the rejected candidate?
- [ ] Not knowing Node.js or AWS
- [x] Not translating known technologies into a well-reasoned system design
- [ ] Too little production experience
- [ ] Slow coding in the first round
**Why:** The candidate cleared round one on technical knowledge; round two failed on requirements, edge cases and justified architecture.
