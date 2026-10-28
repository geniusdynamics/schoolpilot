# Walkthrough scripts (videos outstanding)

The short video walkthroughs of the golden paths are **not produced**. No recordings exist in this
repository, and none were made during this review. What is here instead is the script for each one:
what to click, in order, with the words to say, timed to 60–90 seconds.

The scripts are derived from the end-to-end suites that already drive these paths in a real browser
(`tests/e2e/`: `gp1-lite`, `gp2-setup`, `gp3-marks-results-report`, `gp4-term-cycle`,
`gp5-promotion`, `gp6`, `gp8-backup-restore`) and from the pages they exercise. The labels in
quotes are the labels the tests click. They have not been read aloud or recorded.

## How to record one

| | |
| --- | --- |
| Screen | 1440 × 900 (the size the E2E suite uses) or 1280 × 720; browser at 100% zoom |
| Data | A **demo** school, never a real one. Use invented names, phone numbers and admission numbers. |
| Length | 60–90 seconds. Cut the waits (the app opens its database on first load) rather than talking through them. |
| Audio | One voice, plain language, no jargon ("collection", "provider", "canonical" never appear). |
| Captions | Burn in or ship a `.vtt`: many staff watch with sound off. |
| Ending | Say what the viewer should try next, and where the written guide is. |
| When done | Put the file beside this README as `videos/<name>.mp4` and add it to the table below. |

Before recording, do a dry run with the script in hand. A walkthrough that shows a screen the app no
longer has is worse than no walkthrough.

## The scripts

| # | Walkthrough | Covers | Written guide |
| --- | --- | --- | --- |
| 1 | Set up a school (first run) | First-run choice, the seven-step wizard, first sign-in | [administrator](../administrator.md) |
| 2 | Admit a learner | Admission form, guardian, placement, both registers | [registrar](../registrar.md) |
| 3 | Bill a term and take a payment | Fee schedule, billing run preview, cashier receipt | [bursar](../bursar.md) |
| 4 | Take the register | Class register, mark absences, save | [class teacher](../class-teacher.md) |
| 5 | Enter a mark and publish a report | Mark grid, results, moderation, report publishing | [exams officer](../exams-officer.md) |
| 6 | Promote a year group | Compute, review, override, approve, commit | [head teacher](../head.md) |
| 7 | Back up and restore a hub | Terminal: backup, restore into a fresh directory | [LAN hub, Windows](../deployment/lan-hub-windows.md) |

---

### 1. Set up a school — 90 s

*Opening shot: an empty browser tab.*

**0:00** "This is the first time SchoolPilot has opened on this computer. It has no school in it
yet."

**0:05** Click **Get Started**.

**0:08** "Two choices: explore with demo data, or set up the real school. A school chooses this
one." Click **Go Direct to Production**, then **Continue**.

**0:15** "It tells you plainly what it is about to do." Click **Initialize Production**. *Hold on
"Preparing your database" for two seconds, then cut the wait.*

**0:22** "Step 1 of 7: the school's own details. Only the name is compulsory." Type the name, motto,
address, phone, email. Click **Next**.

**0:33** "Step 2: which curriculum the school follows. Each pack becomes a programme; a school can
run more than one." Tick `ke-cbe` (or `ke-844`). Click **Next**.

**0:42** "Step 3: the year and its terms. Billing, marks and reports are all pinned to a term, so
these dates matter." Click **Next**.

**0:50** "Step 4: the classes and their streams." Type `Form 1`, `North, South`. Click **Add class**
once and fill `Form 2`. Click **Next**.

**0:58** "Step 5: the subjects — un-tick what the school does not offer." Click **Next**.

**1:02** "Step 6: sample data, for training. A real school leaves it off." Click **Next**.

**1:08** "Step 7: the administrator — the account that manages everything." Fill username, display
name and password twice. Click **Finish setup**.

**1:18** "It signs you back in with that account. The school now exists." Sign in, land on the
dashboard. "The written guide is the administrator's guide, under Settings."

*Close.*

---

### 2. Admit a learner — 75 s

**0:00** "A learner is admitted once. This form writes the learner, their guardian, their
identifiers and their first class placement in one go."

**0:06** Sidebar **Admissions** → **Admit learner** (address `/admissions/admit`).

**0:12** "Section one: the learner." Type first name `Amina`, family name `Wanjiku`, pick gender and
residence.

**0:22** "Section two: the guardian. If the school already knows them — a sibling's parent — link
the existing record instead of typing it again." Type the guardian's name and phone.

**0:35** "Section three: where they are going. Programme, level, class group, and the date they
started — not today's date if they joined earlier." Choose the programme, level `Form 1`, class
`North`, a start date, an entry reason.

**0:52** "Section four: identifiers, if the school records them." Skip it.

**0:56** Click **Admit learner**.

**1:00** "The admission number is the number the school will quote from now on." Point at the result
card: name, `ADM/…`, the class group, the guardian count.

**1:08** "It is in both registers." Go to **Admissions → Register**, then
**Administration → Students**. Point at the row in each.

*Close.*

---

### 3. Bill a term and take a payment — 90 s

**0:00** "Billing a term is two steps: a fee schedule, then a billing run. The run previews before
it writes anything."

**0:07** **Finance → Fee Configuration** → **Fee schedules**. "The matrix is the price per level,
per residence, per fee item. A version moves draft → submitted → approved → published, and only a
published version prices a bill." Point at the status badge and the **Publish** button.

**0:28** **Finance → Invoicing** → **Invoice Generation**.

**0:33** "Choose the term." Pick **Academic period** = Term 1. "Level is optional — use it to bill
one cohort." Click **Preview**.

**0:42** "Nobody has been charged yet. This is the plan: who is billed, for how much, and the reason
for every line — and the exceptions, grouped, with a reason for every learner who is not billed."
Scroll the exceptions.

**0:58** Click **Post the run**. "One transaction. Re-running the same run bills nothing twice."

**1:05** "Now the money." **Finance → Payments → Cashier**. **Open session** with an opening float.
Type the admission number, the amount `500`, press `1` for Cash, then **Save (Enter)**.

**1:18** "The receipt prints the learner, the amount in words, the channel and the balance after."
Point at the receipt card. Click **Print receipt (Enter)**.

**1:25** "At the end of the shift, count the cash and close the session." Type a counted amount,
point at the Z-report's per-channel totals. "The written guide is the bursar's guide."

*Close.*

---

### 4. Take the register — 60 s

**0:00** "The register is one class, one day."

**0:05** **Administration → Attendance** → the **Manual Entry** tab.

**0:10** "Today's date, and your class." Pick the class in **Class**.

**0:18** "Everyone starts as present. You mark the exceptions." Click **Absent** on one learner, and
**Late** on another.

**0:30** "The counters at the top follow along." Point at Total, Present, Absent, Late.

**0:38** Click **Save Attendance**. "It says how many records it saved."

**0:45** "Saving the same day again corrects it — it does not create a second register." Click
**Save Attendance** again, point at the confirmation.

**0:55** "On a phone the same page works: the list reflows, the buttons stay big enough to hit."

*Close.*

---

### 5. Enter a mark and publish a report — 90 s

**0:00** "A mark becomes a grade, the grade becomes a report, and a published report never changes
afterwards."

**0:06** **Academics → Marks Entry**. **Period** = Term 1, **Teaching group** = the class's English
group.

**0:14** "One column per assessment, one row per learner. The grid saves as you type." Type `87` in a
cell. Point at the save state.

**0:24** "The workflow is how a term runs: submit, moderate, lock, publish. A correction after the
lock needs a reason." Point at the workflow bar.

**0:33** **Academics → Results**. Pick the period and class group. "The grade is computed from the
pack's bands — it cannot be typed here." Point at the banded grade.

**0:42** Click **Why this grade**. "Every number, in the order the engine computed it. This is the
answer to a parent's question."

**0:52** **Academics → Report Publishing**. Choose the period, the class group and the **Report
template**, click **Generate reports**.

**1:05** "Nothing publishes until a reviewer has seen the batch: here you exclude a learner who must
not get a card." Point at **Review before publish**, exclude one.

**1:15** Click **Publish N reports**. "The snapshot is frozen — a later mark change cannot alter it —
and a re-issue is a new version." Point at the published table and its verification link.

*Close.*

---

### 6. Promote a year group — 90 s

**0:00** "This is the run that moves every learner at once. Nothing happens until a person has
approved it."

**0:06** **Administration → Promotion Run**. Choose **Year being closed** and **Year being opened**.

**0:13** Click **Compute suggestions**. "The suggestions come from the curriculum pack's own
progression rules."

**0:20** "Review per class group: the rule that fired, the suggestion, and the decision." Point at
the table. "Anything a rule cannot decide is listed as a conflict — a human has to settle it before
the run can be approved."

**0:35** Click **Override** on one learner, choose an action, type a reason, save. "The override
keeps the reason."

**0:47** Point at **Approve and commit**. "Approval is the head teacher's. The page says so if your
role cannot."

**0:53** Click **Approve run**, then **Commit run**.

**1:02** Point at the committed record. "Promoted, repeated, graduated, overridden, balances
carried. Undo exists until the school is satisfied."

**1:12** Open the new year's class list. "The learners are in their new classes and the balances
followed them."

*Close.*

---

### 7. Back up and restore a hub — 75 s (terminal)

*This one is not a click-through: the hub's backup is an operator task. Record the terminal.*

**0:00** "A hub takes an encrypted backup every day. This is how you prove one works."

**0:08** Show `<root>\data\backups` with its `.spbk` archives. "Seven daily, four weekly, twelve
monthly. The newest is always kept."

**0:18** "A restore never touches the live database. It writes into a fresh directory, and refuses
one that already holds a database."

**0:26** Type:

```powershell
npx tsx src/server/cli.ts --data-dir .\recovered --backup-passphrase "<passphrase>" `
  --restore-from <root>\data\backups\<archive>.spbk --restore-to .\recovered
```

**0:45** "It decrypts, checks the archive against the digest it recorded, and writes a database."
Point at the restored `schoolpilot.db`.

**0:55** "Copy the backup set off the machine, and copy the restricted-data key with it — without
the key the encrypted medical fields in the archive cannot be read." Point at
`data\keys\restricted-data.key`.

**1:08** "Do this once a month. A backup nobody has restored is a hope."

*Close.*

---

## What is outstanding

| Item | State |
| --- | --- |
| Scripts for seven golden paths | Written (this file) |
| Recordings | **None. Outstanding.** |
| Captions | Outstanding, with the recordings |
| Screenshots for the written guides | Not produced; the guides use screen names and addresses instead |

The one script that needs a decision before recording is #7: it shows a terminal, and the audience
for the deployment guides is an IT generalist, not a bursar. If the video set is meant for school
staff only, drop #7 and keep the rest.

---

Checked on 2026-10-28 against the labels the end-to-end specs click
(`tests/e2e/goldenPathSupport.ts` and the `gp*.spec.ts` files), the pages they visit, and the hub CLI
flags in `src/server/cliArgs.ts`. The timings are a scriptwriter's estimate; none of the walkthroughs
was performed end to end while writing this.
