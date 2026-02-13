# Introduction to CAH Scheduler

[← Back to Index](./README.md) | [Next: Healthcare Scheduling Basics →](./02-healthcare-scheduling-basics.md)

---

## What Problem Does This Solve?

Imagine you're the nurse manager at a small hospital. Every few weeks, you need to create a schedule that answers these questions:

- **Who works when?** You have 20-30 nurses, and the hospital needs coverage 24 hours a day, 7 days a week.
- **Is it fair?** You can't give one person all the weekends off while another works every weekend.
- **Is it safe?** You can't put all inexperienced nurses on the same shift with no supervision.
- **Is it legal?** Nurses can't work 20 hours straight - there are laws about rest time.
- **What if someone calls in sick?** You need a backup plan.

Doing this manually is incredibly difficult. Most nurse managers spend 10-20 hours per schedule just figuring out who works when. And if they make a mistake (like scheduling someone during their vacation), they have to redo it.

**CAH Scheduler automates this entire process.** It knows all the rules, tracks everyone's preferences, and creates fair schedules in minutes instead of days.

---

## What Is a "CAH"?

**CAH** stands for **Critical Access Hospital**. These are small hospitals (usually 25 beds or fewer) located in rural areas. They serve communities that are far from large cities and major medical centers.

### Why Do CAHs Have Special Challenges?

| Challenge | Why It's Hard |
|-----------|---------------|
| **Small Staff** | A big-city hospital might have 500 nurses. A CAH might have 25. If someone calls in sick, there's no large pool to draw from. |
| **Remote Location** | You can't easily bring in temporary workers from staffing agencies - they're hours away. |
| **24/7 Coverage** | Even with few patients, someone must always be there. You can't close the ER at night. |
| **Budget Constraints** | CAHs often operate on thin margins. Overtime costs hurt. |
| **Multi-Skilled Staff** | The same nurse might work in the ER one day and the ICU the next. |

---

## How Does the Scheduler Help?

### 1. Automated Schedule Generation
Instead of manually placing each nurse on each shift, the scheduler can:
- Look at all your staff
- Consider their skills, preferences, and availability
- Apply all the rules (rest time, overtime limits, etc.)
- Generate a complete schedule

### 2. Fair Distribution
The scheduler tracks:
- How many weekends each person has worked
- How many holidays each person has worked
- Who got their preferences met vs. not

This prevents the "squeaky wheel" problem where the loudest complainers always get the best shifts.

### 3. Real-Time Adjustments
When someone calls in sick:
- The scheduler shows you who's available
- It knows who's already on overtime (and would be expensive)
- It follows your hospital's rules for who to call first

### 4. Compliance Tracking
The scheduler prevents illegal or unsafe schedules:
- No working 60+ hours in a week
- Mandatory rest time between shifts
- Required supervision for inexperienced staff

### 5. Complete Audit Trail
Every change is logged:
- Who made the change
- When they made it
- What the old schedule looked like

This is crucial for compliance and resolving disputes.

---

## Who Uses This Application?

| User | What They Do |
|------|--------------|
| **Nurse Manager** | Creates schedules, approves time-off requests, handles callouts |
| **Charge Nurse** | Views the schedule, may make minor adjustments |
| **Staff Nurses** | View their schedules, submit time-off requests, request shift swaps |
| **Administrator/CNO** | Oversees everything, sets policies, approves overtime |

---

## Key Concepts Preview

Here's a quick preview of concepts we'll explore in detail:

### Staff Types
- **Full-Time**: Works 40 hours/week, regular employee
- **Part-Time**: Works fewer hours, regular employee
- **PRN (Per Diem)**: Works "as needed" - must submit availability in advance
- **Float**: Can work in multiple units
- **Agency**: External/contract workers (expensive!)

### Shifts
- **Day Shift**: Usually 7am - 7pm (12 hours)
- **Night Shift**: Usually 7pm - 7am (12 hours)
- **On-Call**: Not at the hospital, but available if needed

### The Two Types of Rules
- **Hard Rules**: Cannot be broken, ever. Example: "Nurses must have 10 hours rest between shifts."
- **Soft Rules**: Preferences that we try to honor. Example: "Try to give Sarah weekends off when possible."

---

## What's Next?

In the next section, we'll dive deeper into **why healthcare scheduling is uniquely challenging** compared to scheduling in other industries like retail or restaurants.

[Next: Healthcare Scheduling Basics →](./02-healthcare-scheduling-basics.md)
