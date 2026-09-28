# Service Scheduler

A tool for school service providers (e.g. speech-language pathologists) to layer the many weekly schedules that constrain their students and find the time those students have free in common for services.

## Language

### People

**Provider**:
The service professional using the tool (e.g. an SLP) who schedules services for their Caseload.
_Avoid_: Teacher, user, SLP (as a general term)

**Student**:
One child on the Provider's Caseload, identified by a unique Name.
_Avoid_: Kiddo, kid, client

**Caseload**:
The full set of Students a Provider manages.
_Avoid_: Roster, class, list

**Name**:
The required, unique identifier of a Student; need not be a legal name.
_Avoid_: ID, label

**Property**:
A Provider-defined attribute every Student can have a value for, of type Select (one Option, e.g. Grade, Teacher) or Checkbox (e.g. EL). Properties can be added, renamed and removed; a Student may leave any Property unset.
_Avoid_: Tag, field, attribute, boolean, text

**Option**:
One of the values a Select Property takes (e.g. "4th" for Grade). A Select Property's Options are the values its Students currently use.
_Avoid_: Tag, choice, badge

### Schedules

**Schedule**:
A named, colored weekly layer of time that applies to some Students and constrains when they can receive services.
_Avoid_: Calendar, layer

**Allow Schedule**:
A Schedule whose marked time is the only time its Students can be seen (e.g. School Hours).
_Avoid_: Availability schedule, include schedule

**Deny Schedule**:
A Schedule whose marked time is when its Students cannot be seen (e.g. Recess).
_Avoid_: Blocking schedule, exclude schedule, busy

**Window**:
One stretch of time within a Schedule, sharing the same start and end across one or more Linked Days. Windows in the same Schedule may overlap; overlapping time counts once.
_Avoid_: Block, slot, event, span

**Linked Days**:
The contiguous run of weekdays a Window (or Session) covers together, so editing its time on one changes it on all (e.g. Mon–Fri, or Thu–Fri).
_Avoid_: Recurrence, repeat

**Audience**:
The rule that decides which Students a Schedule applies to: either Everyone, or a set of Conditions that must all match. Membership is live: a Student who gains a matching Property value joins automatically.
_Avoid_: Assignees, filter, criteria, tags

**Everyone**:
An Audience that matches every Student on the Caseload, present and future.
_Avoid_: All students, select all

**Condition**:
One test on a Student's Property within an Audience: a Select Property "is any of" given Options, or a Checkbox Property "is checked"/"is unchecked". Name can also be used in a Condition.
_Avoid_: Filter, rule, clause

**Template Week**:
The single repeating Monday–Friday week all Schedules and Sessions are defined on; it has no calendar dates.
_Avoid_: Calendar week

### Planning

**Free Time**:
For one Student, the time inside every one of their Allow Schedules and outside all of their Deny Schedules and Sessions.
_Avoid_: Open time, availability

**Common Free Time**:
The time that is Free Time for every Student in a selected group.
_Avoid_: Overlap, shared availability

**Session**:
A booked time on one or more Linked Days of the Template Week in which the Provider serves a group of Students. A Session is kept even if all of its Students are removed.
_Avoid_: Event, appointment, meeting

**Conflict**:
A Session that overlaps time that isn't Free Time for one of its Students. Conflicts are allowed and flagged, not prevented.
_Avoid_: Error, clash

**Planner**:
The screen where the Provider selects Students, sees their Schedules layered together, and books Sessions into Common Free Time.
_Avoid_: Layout page, scheduling page

### Sharing

**Export**:
A file of some Schedules, a Caseload, or both, sent to a teammate so they needn't re-enter it. Importing one adds to what's there; it never carries Sessions.
_Avoid_: Share, template

**Backup**:
A file of everything the Provider has, Sessions included, kept for safekeeping or to move browsers. Importing one replaces everything.
_Avoid_: Account export, snapshot
