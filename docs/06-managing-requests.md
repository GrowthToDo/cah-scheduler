# Managing Requests

[← Back to Index](./README.md) | [← Previous: Scheduling Rules](./05-scheduling-rules.md) | [Next: Handling Callouts →](./07-handling-callouts.md)

---

## Types of Requests

Staff regularly submit requests that affect scheduling. There are three main types:

1. **Leave Requests** - "I need time off"
2. **Shift Swap Requests** - "I want to trade shifts with someone"
3. **PRN Availability** - "Here's when I can work" (PRN staff only)

---

## Leave Requests

### What Is a Leave Request?

A leave request is when staff asks for time off from work.

**Common scenarios:**
- "I want to take vacation February 10-15"
- "I need to be out for surgery next month"
- "I have a family emergency tomorrow"

### Types of Leave

| Leave Type | Description | Typical Notice |
|------------|-------------|----------------|
| **Vacation** | Planned time off for rest/travel | Weeks/months in advance |
| **Sick** | Illness, can't work | Day of or day before |
| **Maternity/Paternity** | New baby | Months in advance (usually) |
| **Medical** | Surgery, treatment, recovery | Weeks in advance |
| **Personal** | Personal matters (moving, etc.) | Varies |
| **Bereavement** | Death in family | Immediate |
| **Other** | Anything else | Varies |

### The Leave Request Workflow

```
Staff Submits Request
        ↓
   Request is "Pending"
        ↓
Manager Reviews
        ↓
   ┌────┴────┐
   ↓         ↓
Approved   Denied
   ↓         ↓
Cannot be  Staff must
scheduled  work (or
those days resubmit)
```

### What Happens When Leave Is Approved?

1. **The dates are blocked** - Staff cannot be scheduled during this period
2. **Shift gaps identified** - Manager sees where coverage is needed
3. **Coverage planned** - Other staff or PRN fill the gaps

### What Happens When Leave Is Denied?

1. **Staff is notified** - They see their request was denied
2. **Reason provided** - Manager explains why (e.g., "Too many people already off")
3. **Staff can resubmit** - Maybe different dates would work

### Who Can Approve Leave?

Typically:
- **Nurse Manager** - Day-to-day approvals
- **Director/CNO** - Extended leave, special circumstances

### Why Would Leave Be Denied?

- Too many people already off on those dates
- Critical coverage period (e.g., holiday season)
- Not enough notice given
- Leave balance insufficient

---

## Shift Swap Requests

### What Is a Shift Swap?

A shift swap is when two staff members trade shifts with each other.

**Example:**
> Maria is scheduled for Tuesday Day. She wants to go to her kid's school event.
> John is scheduled for Thursday Day. He'd rather work Tuesday.
> They swap: Maria works Thursday, John works Tuesday.

### Why Allow Swaps?

- **Flexibility** - Staff can handle unexpected life events
- **Retention** - Feeling of control over schedule
- **Coverage** - Hospital still has the shifts covered
- **Morale** - Employees help each other

### The Swap Request Workflow

```
Staff A Requests Swap
        ↓
Specifies: "I want to give up Shift X"
           "I want to take Shift Y from Staff B"
        ↓
   Request is "Pending"
        ↓
Manager Reviews
   - Is the swap safe?
   - Do both parties agree?
   - Any rule violations?
        ↓
   ┌────┴────┐
   ↓         ↓
Approved   Denied
   ↓         ↓
Shifts     Nothing
swapped    changes
```

### What Does the Manager Check?

Before approving a swap, the manager verifies:

| Check | Question |
|-------|----------|
| **Coverage** | Will both shifts still be properly staffed? |
| **Qualifications** | Can each person actually work the other's shift? |
| **Rest Time** | Will the swap create a rest violation? |
| **Overtime** | Will the swap push someone into overtime? |
| **Supervision** | Will proper supervision still be present? |

### Example: Valid Swap

> **Before:**
> - Tuesday Day: Maria (RN, Level 4), John (RN, Level 3), others...
> - Thursday Day: Lisa (RN, Level 4), Tom (RN, Level 3), others...
>
> **Swap Request:** Maria ↔ Lisa
>
> **After:**
> - Tuesday Day: Lisa (RN, Level 4), John (RN, Level 3), others...
> - Thursday Day: Maria (RN, Level 4), Tom (RN, Level 3), others...
>
> **Result:** Both shifts still have a Level 4 nurse. Approved!

### Example: Invalid Swap

> **Before:**
> - Tuesday Day: Maria (RN, Level 5, Charge), others...
> - Thursday Day: John (RN, Level 3), others...
>
> **Swap Request:** Maria ↔ John
>
> **Problem:** Tuesday Day would have no charge-qualified nurse!
>
> **Result:** Denied - violates Charge Nurse requirement.

### Open Requests

Sometimes staff submit a swap request without a specific trade partner:

> "I need to give up my Tuesday shift. Anyone want it?"

This creates an "open request" that any qualified staff can pick up.

---

## PRN Availability

### What Is PRN Availability?

PRN (per diem) staff aren't scheduled automatically. They must tell us when they're available to work.

**Think of it as:** "Here are the days I'm willing and able to work."

### Why Is This Required?

PRN staff have no obligation to work. They work "as needed" when it suits them. But we can only count on them if we know when they're available.

**Without availability submission:**
- We can't schedule them
- They might miss out on shifts
- We might be understaffed

### The Availability Workflow

```
New Schedule Period Opens
(e.g., March 1 - April 15)
        ↓
PRN Staff Notified
"Submit your availability by Feb 15"
        ↓
PRN Staff Submit
"I can work March 3, 5, 10, 12, 15..."
        ↓
Manager Creates Schedule
Only assigns PRN to dates they marked available
        ↓
Schedule Published
PRN staff see their assignments
```

### What PRN Staff Submit

For each schedule period:
- **List of available dates** - "I can work March 3, 5, 10..."
- **Notes (optional)** - "Prefer day shifts" or "Available after 3pm only"

### Viewing Availability (Manager Side)

Managers can see:
- Which PRN staff have submitted availability
- Which PRN staff have NOT submitted (need a reminder?)
- A calendar view of who's available when

### Example Scenario

> **Schedule Period:** March 1 - April 15 (6 weeks)
>
> **PRN Staff:**
> - Tom: Available 12 days
> - Sarah: Available 8 days
> - Mike: Has not submitted!
>
> **Manager Action:**
> 1. Remind Mike to submit
> 2. Build schedule using Tom and Sarah's availability
> 3. If Mike never submits, he gets no shifts

---

## Managing Requests in the App

### Leave Management Page (`/leave`)

**What you see:**
- List of all leave requests
- Filter by status (Pending, Approved, Denied)
- Staff name, dates, leave type

**What you can do:**
- **Create** a new leave request (on behalf of staff)
- **Approve** pending requests
- **Deny** pending requests

### Shift Swaps Page (`/swaps`)

**What you see:**
- List of all swap requests
- Who wants to swap with whom
- Which shifts are involved
- Status of each request

**What you can do:**
- **Approve** pending swaps
- **Deny** pending swaps
- Filter by status

### PRN Availability Page (`/availability`)

**What you see:**
- List of PRN staff
- Who has submitted availability
- Who is missing (hasn't submitted)
- Available dates for each person

**What you can do:**
- View the availability calendar
- Identify who needs reminders
- Plan coverage based on availability

---

## Best Practices

### For Leave Requests

1. **Set clear deadlines** - "Vacation requests due 2 weeks in advance"
2. **First-come, first-served** - Encourages early planning
3. **Holiday blackout periods** - Communicate when leave is restricted
4. **Approval timeframes** - "You'll hear back within 48 hours"

### For Shift Swaps

1. **Allow reasonable swaps** - Don't be too restrictive
2. **Check all rules** - Use the system's validation
3. **Document denials** - Explain why so staff understands
4. **Encourage direct swaps** - Staff should find their own trades first

### For PRN Availability

1. **Send reminders** - "Availability due in 3 days!"
2. **Set deadlines** - "Submit by the 15th of the prior month"
3. **Reward reliability** - PRN who submit on time get first pick
4. **Follow up** - Contact staff who don't submit

---

## Summary

Request management is a key part of scheduling:

**Leave Requests:**
- Staff request time off
- Manager approves or denies
- Approved leave blocks scheduling

**Shift Swaps:**
- Staff trade shifts with each other
- Manager ensures swap is safe
- Both parties must benefit

**PRN Availability:**
- PRN staff submit when they can work
- Scheduler only uses available dates
- No submission = no shifts

The application provides dedicated pages for managing all three types of requests, keeping everything organized and auditable.

---

[Next: Handling Callouts →](./07-handling-callouts.md)
