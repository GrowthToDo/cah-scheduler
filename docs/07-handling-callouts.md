# Handling Callouts

[← Back to Index](./README.md) | [← Previous: Managing Requests](./06-managing-requests.md) | [Next: Configuration →](./08-configuration.md)

---

## What Is a Callout?

A **callout** is when a scheduled staff member cannot come to work.

**Common scenarios:**
- "I woke up sick and can't come in"
- "My car broke down"
- "I have a family emergency"
- "I just... didn't show up" (no-show)

Callouts are **unplanned absences** - unlike scheduled leave, they happen suddenly.

---

## Why Callouts Are a Big Deal

When someone calls out:

1. **Immediate Problem** - You're now short-staffed
2. **Patient Safety Risk** - Remaining staff are stretched thin
3. **Scramble to Cover** - Someone needs to find a replacement FAST
4. **Cost Implications** - Replacement might be on overtime or agency

**Time pressure:** Callouts often happen hours before a shift. The manager might get a call at 5:30 AM saying "I can't make my 7 AM shift."

---

## Callout Reasons

The system tracks why people call out:

| Reason | Description |
|--------|-------------|
| **Sick** | Illness - the most common reason |
| **Family Emergency** | Family member needs help |
| **Personal** | Personal matter (moving, car trouble, etc.) |
| **No-Show** | Staff simply didn't appear and didn't call |
| **Other** | Anything else |

**Why track reasons?**
- Pattern detection (someone always "sick" on Mondays?)
- Absence management
- HR documentation

---

## The Escalation Sequence

When a callout happens, the manager follows an **escalation sequence** to find a replacement. This is a prioritized list of who to call:

### Default Escalation Order

```
1. Float Pool Staff
   ↓ (if none available)
2. PRN (Per Diem) Staff
   ↓ (if none available)
3. Regular Staff for Overtime
   ↓ (if none available)
4. Agency Staff
```

### Why This Order?

| Step | Who | Why First/Last |
|------|-----|----------------|
| 1. Float | Float pool nurses | Already available, designed for this |
| 2. PRN | Per diem nurses | Available on-demand, lower cost than OT |
| 3. Overtime | Regular staff extra shift | More expensive, but reliable |
| 4. Agency | External contract nurses | Most expensive, last resort |

**The goal:** Find coverage at the lowest cost while ensuring patient safety.

---

## The Callout Workflow

Here's what happens when someone calls out:

### Step 1: Log the Callout

```
Staff calls/texts: "I can't come in today"
        ↓
Manager logs in system:
- Who called out
- What shift
- What reason
- When they called
```

### Step 2: Check Coverage Need

```
Is the shift now understaffed?
        ↓
┌───────┴───────┐
↓               ↓
Yes             No (still have enough)
↓               ↓
Need to find    Log it, but no
replacement     urgent action
```

### Step 3: Follow Escalation Sequence

```
Step 1: Check Float Pool
"Any float nurses available today?"
   ↓
   Found → Assign them → Done!
   ↓
   Not found → Continue
        ↓
Step 2: Check PRN Staff
"Which PRN nurses marked today as available?"
Contact them in order
   ↓
   Found one willing → Assign them → Done!
   ↓
   None available → Continue
        ↓
Step 3: Offer Overtime
"Which regular staff are off but could work?"
Contact them to offer extra shift
   ↓
   Someone accepts → Assign them (mark as OT) → Done!
   ↓
   No takers → Continue
        ↓
Step 4: Call Agency
Contact external staffing agency
Request available nurse
   ↓
   Agency has someone → Assign them → Done!
   ↓
   No one available → Escalate to leadership
```

### Step 4: Resolution

Every callout ends in one of these states:

| Status | Meaning |
|--------|---------|
| **Filled** | Replacement found! Shift is covered. |
| **Unfilled (Approved)** | No replacement found, but leadership approved running short. |
| **Open** | Still looking for coverage |

---

## Recording Escalation Steps

The system tracks each step of the escalation:

```json
[
  {
    "step": "float",
    "attempted": true,
    "result": "No float staff available today",
    "timestamp": "2024-02-15 05:45:00"
  },
  {
    "step": "per_diem",
    "attempted": true,
    "result": "Called Tom - no answer. Called Sarah - accepted!",
    "timestamp": "2024-02-15 05:52:00"
  }
]
```

**Why track this?**
- Audit trail (we tried everything)
- Process improvement (how long did it take?)
- Pattern analysis (always short on Mondays?)

---

## Who Gets Called First?

Within each escalation step, who do you call first?

**Common approaches:**

1. **Rotate fairly** - Take turns so the same person isn't always called
2. **Availability-based** - Only call people who aren't already working
3. **Proximity** - Call people who live closer (shorter commute)
4. **Reliability** - Call people who usually say yes

The scheduler helps by showing:
- Who's available (not already scheduled)
- Who's qualified for this unit
- Who would go into overtime (more expensive)

---

## Real-World Example

**Scenario:** Maria calls in sick for Tuesday Day shift at 5:30 AM

**Current Tuesday Day shift coverage:**
- Maria (called out!)
- John
- Lisa
- Sarah

**Needed:** 4 nurses. Now have 3. Need 1 replacement.

**Escalation:**

| Time | Action | Result |
|------|--------|--------|
| 5:32 | Check float pool | None available today |
| 5:35 | Call PRN Tom | No answer |
| 5:38 | Call PRN Jenny | "I can be there by 8:30" |
| 5:40 | Confirm Jenny | Assigned! Callout marked "Filled" |

**Outcome:** Shift is covered. Jenny (PRN) comes in. Small gap from 7:00-8:30, but team manages.

---

## Callouts Page in the App

### What You See

- List of all callouts (recent and historical)
- Which shift was affected
- Who called out and why
- Replacement details (if found)
- Status (Open, Filled, Unfilled Approved)

### What You Can Do

1. **Log a callout** - Record when someone can't come
2. **Track escalation** - Document who you called
3. **Assign replacement** - Mark who's covering
4. **Close the callout** - Mark as filled or unfilled

---

## Running Short-Staffed

Sometimes you can't find anyone. What then?

### CNO Approval

If all escalation steps fail:
1. Manager reports to leadership (CNO/Director)
2. Leadership assesses risk
3. Decision made: Run short or take other action
4. If approved, callout marked "Unfilled Approved"

### Mitigation Strategies

When running short:
- Reduce patient assignments (if possible)
- Pull from other units
- Charge nurse takes patients
- Manager comes in to help
- Reduce admissions

### Documentation

Running short requires documentation:
- What happened
- Why no replacement was found
- What mitigation was done
- Who approved it

This protects the hospital legally and helps improve processes.

---

## Reliability Tracking

Over time, the system can identify patterns:

### Staff Level
- "Tom has called out 12 times this year"
- "Sarah has called out 2 times in 3 years"

### Unit Level
- "ICU has 5x more callouts than Med-Surg"
- "Night shifts have more callouts than days"

### Day Level
- "Mondays have 40% more callouts"
- "Day after Super Bowl: callout spike!"

**Why track this?**
- Address individual attendance issues
- Staff appropriately for high-callout days
- Identify systemic problems

---

## Coverage Requests (Auto-Fill)

When leave is approved in advance, the system automatically finds replacement candidates and presents them for manager approval.

### Callout vs. Coverage Request

| Type | When Created | What Happens | Example |
|------|--------------|--------------|---------|
| **Callout** | Last-minute (within 7 days) | Follows manual escalation | Staff calls in sick morning of shift |
| **Coverage Request** | Advance notice (beyond 7 days) | Auto-finds top 3 candidates | Leave approved 3 weeks ahead |

### Automatic Candidate Finding

When a manager approves leave (beyond threshold):
1. System finds all affected shifts during leave dates
2. For each shift, automatically searches for replacement candidates:
   - **Step 1:** Check Float Pool staff
   - **Step 2:** Check PRN staff who marked the date as available
   - **Step 3:** Check regular staff for overtime
   - **Step 4:** Agency option (requires external contact)
3. Top 3 candidates are presented with reasons
4. Manager reviews and approves one candidate
5. Assignment is created automatically

### Coverage Page (`/open-shifts`)

This page shows coverage requests with recommendations:
- **Pending** tab: Requests waiting for manager approval
- Each request shows the top recommended candidate
- Click **Review** to see all 3 candidates with reasons
- Approve a candidate to auto-assign them
- Each candidate shows:
  - Source (Float Pool, PRN, Overtime, Agency)
  - Reasons (e.g., "Cross-trained for ICU", "High reliability")
  - Whether it would be overtime
  - Hours worked this week

---

## Low Census vs. Callouts

**Callout:** Unplanned - staff can't come, shift is unexpectedly short.

**Low Census:** Planned - census dropped, we have too many staff, need to send someone home.

These are opposites! But both require the manager to adjust staffing.

| Situation | Problem | Action |
|-----------|---------|--------|
| Callout | Not enough staff | Find more |
| Low Census | Too many staff | Send some home |

### Low Census Order

When census drops, who goes home first?

**Updated Order (v1.2):**
1. **Voluntary (VTO)** - Staff who indicated willingness to go home
2. **Overtime** - Staff on OT (most expensive)
3. **Per Diem** - PRN staff
4. **Full Time** - Regular staff (only if necessary)

**Note:** Agency staff are NOT in the low census order because their contracts typically guarantee minimum hours.

### Voluntary Time Off (VTO)

Staff can indicate they're "Available for VTO" in their profile:
- These staff are prioritized first when low census requires sending people home
- VTO is completely voluntary
- Staff can toggle this on/off anytime
- Managers can also update on behalf of staff

---

## Summary

Callouts are inevitable, but manageable:

1. **Log promptly** - Document who called out and why
2. **Follow escalation** - Float → PRN → Overtime → Agency
3. **Track steps** - Document who you contacted
4. **Resolve properly** - Fill the shift or get approval to run short
5. **Learn from patterns** - Use data to improve

The Callouts page in the app helps managers:
- See current callouts
- Track escalation efforts
- Find available replacements
- Document everything for compliance

---

[Next: Configuration →](./08-configuration.md)
