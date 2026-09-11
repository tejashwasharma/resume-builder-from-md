# Hard questions

The ones that aren't about technology. People who prepare only the technical
rounds lose offers here.

Rule for all of them: **short, specific, forward-facing, then stop talking.**
Over-explaining is what turns a neutral fact into a red flag.

---

## "Why did you leave Contentstack?" / "Why aren't you working right now?"

**Guaranteed.** Your resume shows Aug 2026, and it's now September 2026. Every
reader notices.

**The shape of a good answer:** two or three sentences. What changed, what you
want next. No criticism of the company, no apology, no long backstory. Land on
what you're looking for and hand the conversation back.

**What sinks it:**
- Criticising former management or teammates — the single most damaging thing
  you can do in an interview, and it's always read as "this will be said about
  us next."
- Over-explaining. Length signals discomfort, and discomfort invites digging.
- Vagueness that sounds evasive. "It was time for a change" with no substance
  makes people wonder what you're not saying.

**If it was a layoff or restructuring:** say so plainly. It carries no stigma
now, and matter-of-factness is itself reassuring. *"My role was cut in a
restructuring in August. I've been using the time to go deep on distributed
systems and system design, and I'm looking for a platform role where identity
is the core problem, not a side concern."*

**If you chose to leave:** be concrete about what you were moving *toward*,
never what you were fleeing.

> **FILL IN — this one is genuinely yours.** What actually happened, and how
> do you want it to sound? I won't script a reason. Write your two sentences
> here and rehearse them until they're boring to say:
>
> ```
> (your answer)
> ```

**Follow-ups to expect:** "What have you been doing since?" — have a real
answer (this repo is one). "How's the search going?" — never sound desperate or
say you have no other processes running.

---

## "Tell me about yourself"

Almost always first, and most people waste it by narrating their resume
chronologically.

**Better structure**, 60–90 seconds:
1. **Now:** what you do and your specialty — *"I'm a senior engineer
   specialising in identity and access management — I spent the last four
   years building the auth platform at a multi-tenant content SaaS."*
2. **Proof:** one or two headline achievements — RBAC 0→1, and the auth layer
   at 2–3B daily requests.
3. **Next:** why you're talking to *them* specifically.

Do not recite jobs backwards to 2019. They have the resume.

> **FILL IN:** your 60-second version, written out. This is the most-repeated
> answer you'll give, and it sets the frame for everything after it.

---

## "What's your biggest weakness?"

Still asked. The dodge ("I work too hard") is transparent and costs you
credibility.

**What works:** a real weakness, plus the concrete mechanism you use to manage
it, plus evidence it's improving. Structure matters more than which weakness
you pick.

**Candidates from your own material** — pick something true:
- Depth-first instinct: going deep on the interesting problem when the boring
  one is more urgent. Managed by explicit prioritisation checkpoints.
- Breadth gaps from specialising: four years deep in auth means less recent
  frontend and infra exposure. Managed by deliberately studying it (and you
  can point at this repo).

**Never say:** perfectionism, working too hard, caring too much. All read as
non-answers.

---

## "Tell me about a conflict with a colleague"

They're testing whether you can disagree without damage, and whether you can
describe a conflict without villainising the other person.

**Structure:** the disagreement (technical, ideally), both positions stated
fairly, how it resolved, what you'd do differently.

**Critical:** describe the other person's position as they would describe it.
A story where you were obviously right and they were obviously an idiot is a
worse answer than one where you were wrong — because it tells the interviewer
how you'll talk about *them* later.

**Strongest version:** one where you changed your mind.

> **FILL IN:** your conflict story. Candidates from your history: pushback on
> the RBAC model, resistance to the auth npm package from a product team, or
> skepticism about AI adoption. All three are real, low-stakes, and end well.

---

## "Tell me about a time you failed"

They want ownership without self-flagellation.

**Structure:** what happened, your specific contribution to it going wrong,
the impact, what you changed. Spend most of the time on the last part.

**Avoid:** a fake failure that's secretly a success ("I shipped too fast and
it was too popular"). Interviewers have heard it and it wastes the question.

**Good candidates:** an incident from the auth on-call story, or an early RBAC
design decision you had to reverse. The RBAC one is especially strong — it
doubles as proof you really led that project.

> **FILL IN:** your failure story.

---

## "Why do you want to work here?"

The one people wing, and the easiest to prepare.

**Needs to be specific to them.** Their product, their scale, their engineering
blog, their identity problem. "You're a great company with great culture"
signals you're mass-applying.

**Connect it to you:** what about their problem matches what you're good at.

> **FILL IN when you have a target company.** Research: what's their auth
> model? Multi-tenant? Do they publish engineering content? Any recent
> security incident or compliance milestone worth knowing about?

---

## Salary

**Don't name a number first if you can avoid it.** Deflect once, politely:
*"I'd rather understand the role and level first — what range is budgeted for
this position?"* Most places will tell you.

**If pressed:** give a researched range, not a point, and anchor at the top of
what's defensible. Say the range is based on market data for the level and
location.

**Never:** state your previous salary as your expectation. Illegal to ask in
some jurisdictions, and it anchors you to your old employer's compensation
rather than this role's value.

> **FILL IN:** your researched range for Senior/Staff IAM-platform roles in
> your market — remote-India, India-based product companies, and remote-global
> if you're targeting that. And your walk-away number, decided *before* you're
> in the conversation.

---

## Questions to ask them

Not optional. "No questions" reads as disinterest, and the questions you ask
signal your level as much as your answers.

**Strong — signals seniority:**
- "What does the identity/auth surface look like today, and what's the biggest
  problem with it?"
- "How do authorization decisions get made in your architecture — centralised
  service, embedded library, sidecar?"
- "What's on-call like for this team? How often does it page?"
- "How do you decide what goes on the platform roadmap versus product asks?"
- "What would you want the person in this role to have accomplished in six
  months?"
- "What's the biggest technical debt you'd want them looking at?"

**For the hiring manager specifically:**
- "How is performance evaluated for this level?"
- "What's the path from here — what does the next level look like?"
- "What's the team's biggest constraint right now: headcount, clarity,
  infrastructure?"

**Avoid until an offer exists:** vacation policy, working hours, how soon you
can be promoted.

**Always ask last:** "Is there anything about my background that gives you
hesitation?" — it's the only chance you get to address a concern before it
becomes a rejection, and it takes real confidence to ask. Interviewers notice.

---

## Rapid checklist before any interview

- [ ] Two-sentence answer to "why did you leave" — rehearsed, unemotional
- [ ] 60-second "tell me about yourself"
- [ ] One failure story, one conflict story, one proudest-work story
- [ ] Every number on your resume defensible (2–3B, 13s→200ms, 9 teams, ~150→10)
- [ ] Six questions for them, at least two company-specific
- [ ] Salary range and walk-away number decided
- [ ] [WEAK-SPOTS](../WEAK-SPOTS.md) reviewed — know where you're exposed
