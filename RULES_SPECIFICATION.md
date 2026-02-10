# CAH Scheduler - Complete Rules Specification

**Document Version:** 1.0
**Last Updated:** February 2026
**Purpose:** This document describes all scheduling rules and logic implemented in the CAH Scheduler application. Please review and mark any rules that need modification.

---

## Table of Contents
1. [Staff Attributes](#1-staff-attributes)
2. [Shift Types](#2-shift-types)
3. [Hard Rules (Must Not Be Violated)](#3-hard-rules-must-not-be-violated)
4. [Soft Rules (Preferences & Penalties)](#4-soft-rules-preferences--penalties)
5. [Unit Configuration Options](#5-unit-configuration-options)
6. [Census Bands & Staffing](#6-census-bands--staffing)
7. [Escalation & Callout Workflow](#7-escalation--callout-workflow)
8. [Low Census Policy](#8-low-census-policy)

---

## 1. Staff Attributes

### 1.1 Roles
| Role | Description |
|------|-------------|
| **RN** | Registered Nurse |
| **LPN** | Licensed Practical Nurse |
| **CNA** | Certified Nursing Assistant |

### 1.2 Employment Types
| Type | Description |
|------|-------------|
| **Full Time** | Regular employee, typically 1.0 FTE (40 hours/week) |
| **Part Time** | Regular employee, less than 1.0 FTE |
| **Per Diem (PRN)** | Works on-demand, must submit availability in advance |
| **Float** | Works across multiple units, no fixed home unit |
| **Agency** | External/contract staff |

### 1.3 ICU Competency Levels
| Level | Name | Description | Restrictions |
|-------|------|-------------|--------------|
| **1** | Novice/Orientee | New hire in orientation period | Cannot take patients alone. Must be paired with Level 5 preceptor. FTE contribution = 0 for staffing calculations. |
| **2** | Advanced Beginner | Can handle stable patients | Can take Med-Surg/Swing Bed patients. Cannot work ICU/ER alone - must have Level 4+ supervisor on same shift. |
| **3** | Competent | Fully functional nurse | Can take standard ICU/ER patient load. Should have ACLS/PALS certification. |
| **4** | Proficient (Trauma Ready) | Experienced, can handle critical situations | TNCC certified. Can handle Codes/Trauma alone until backup arrives. |
| **5** | Expert (Charge/Preceptor) | Most experienced | Qualified to be Charge Nurse. Can precept Level 1 staff. Can take the sickest patients. Can manage the unit. |

### 1.4 Other Staff Attributes
| Attribute | Description |
|-----------|-------------|
| **Home Unit** | The staff member's primary assigned unit (e.g., ICU, ER, Med-Surg) |
| **Cross-Trained Units** | Other units the staff is qualified to work in |
| **Charge Nurse Qualified** | Whether staff can serve as the shift's charge nurse |
| **Weekend Exempt** | If true, staff is exempt from weekend requirements (set by Admin only, for HR accommodations) |
| **Reliability Rating** | 1-5 scale indicating historical reliability |
| **FTE** | Full-Time Equivalent (1.0 = 40 hours/week, 0.5 = 20 hours/week) |
| **Flex Hours YTD** | Tracks how many hours staff has been flexed home (for fair rotation) |

---

## 2. Shift Types

### 2.1 Regular Shifts
| Shift | Default Hours | Counts Toward Staffing |
|-------|---------------|------------------------|
| **Day** | 07:00 - 19:00 (12 hours) | Yes |
| **Night** | 19:00 - 07:00 (12 hours) | Yes |
| **Evening** | 13:00 - 01:00 (12 hours) | Yes |

### 2.2 Special Shifts
| Shift | Description | Counts Toward Staffing |
|-------|-------------|------------------------|
| **On-Call** | Staff is available to be called in if needed | **No** - does not count toward census staffing requirements |

### 2.3 Acuity Levels (Set per shift by CNO/Manager)
| Level | Meaning | Effect |
|-------|---------|--------|
| **Green** | Normal acuity | Standard staffing |
| **Yellow** | Elevated acuity | +1 additional staff needed (configurable) |
| **Red** | High acuity/crisis | +2 additional staff needed (configurable) |

---

## 3. Hard Rules (Must Not Be Violated)

Hard rules are constraints that **cannot be broken**. The scheduler will not create assignments that violate these rules.

### 3.1 Minimum Staff Per Shift
- **Rule:** Each shift must meet the minimum staff count defined by either:
  - The shift definition's required staff count, OR
  - The census band requirements (if census is set)
- **Applies to:** All shifts where `countsTowardStaffing = true`

### 3.2 Charge Nurse Required
- **Rule:** If a shift requires a charge nurse, at least one assigned staff member must be charge-nurse qualified
- **Applies to:** Shifts marked as `requiresChargeNurse = true`

### 3.3 Patient-to-Licensed-Staff Ratio
- **Rule:** The ratio of patients to licensed staff (RN + LPN combined) must not exceed the census band limit
- **Example:** If census band says 2:1 ratio and there are 8 patients, you need at least 4 licensed staff (RNs + LPNs)
- **Note:** CNAs do not count toward this ratio

### 3.4 Minimum Rest Between Shifts
- **Rule:** Staff must have at least **10 hours** of rest between the end of one shift and the start of the next
- **Purpose:** Prevents fatigue and ensures safety
- **Configurable:** Yes, default is 10 hours

### 3.5 Maximum Consecutive Days
- **Rule:** Staff cannot work more than **5 consecutive days** without a day off
- **Configurable:** Yes, default is 5 days

### 3.6 ICU Competency Minimum
- **Rule:** Staff assigned to ICU must have a minimum competency level of **2**
- **Purpose:** Level 1 staff cannot work ICU independently

### 3.7 Level 1 Preceptor Required *(NEW)*
- **Rule:** Any Level 1 (Novice/Orientee) staff member scheduled for a shift must have a Level 5 (Expert/Preceptor) staff member also assigned to the **same shift**
- **Purpose:** Orientees must always have a preceptor present

### 3.8 Level 2 ICU/ER Supervision Required *(NEW)*
- **Rule:** Level 2 (Advanced Beginner) staff working in **ICU or ER** must have at least one Level 4 or Level 5 staff member on the same shift
- **Purpose:** Advanced beginners need supervision in critical care areas
- **Note:** This rule only applies to ICU and ER units, not Med-Surg

### 3.9 No Overlapping Shifts *(NEW)*
- **Rule:** A staff member cannot be assigned to two shifts that overlap in time
- **Example:** Cannot be assigned to Day shift (07:00-19:00) and Evening shift (13:00-01:00) on the same day

### 3.10 PRN Availability *(NEW)*
- **Rule:** Per Diem (PRN) staff can **only** be scheduled on days they have marked as available
- **Process:** PRN staff submit their availability for each schedule period (6 weeks out)
- **Note:** If a PRN staff member has not submitted availability, they cannot be scheduled

### 3.11 Staff On Leave *(NEW)*
- **Rule:** Staff with **approved leave** cannot be scheduled during their leave period
- **Leave Types:** Vacation, Sick, Maternity, Medical, Personal, Bereavement, Other
- **Note:** Only approved leave blocks scheduling; pending leave requests do not

### 3.12 On-Call Limits *(NEW)*
- **Rule:** Staff cannot exceed on-call limits:
  - Maximum **1 on-call shift per week** (configurable)
  - Maximum **1 on-call weekend per month** (configurable)
- **Purpose:** Prevents burnout from excessive on-call duty

### 3.13 Maximum 60 Hours in 7 Days *(NEW)*
- **Rule:** Staff cannot work more than **60 hours** in any rolling 7-day period
- **Calculation:** Looks at any 7 consecutive days, not just Monday-Sunday
- **Purpose:** Safety limit to prevent extreme fatigue

---

## 4. Soft Rules (Preferences & Penalties)

Soft rules are **preferences** that the scheduler tries to optimize. Violations incur penalty scores, and the scheduler tries to minimize total penalties. These can be overridden by managers when necessary.

### 4.1 Overtime & Extra Hours *(UPDATED)*
**Previous Logic (Incorrect):** Any hours over (FTE × 40) counted as overtime

**Current Logic:**
| Scenario | Penalty Level | Example |
|----------|---------------|---------|
| Hours > 40 in a week | **HIGH** penalty (actual overtime) | A 1.0 FTE nurse working 44 hours = 4 hours OT |
| Hours > (FTE × 40) but ≤ 40 | **LOW** penalty (extra hours, not OT) | A 0.9 FTE nurse (36 standard hours) working 40 hours = 4 extra hours but NOT overtime |

**Rationale:** It's better to pay staff extra shift premium than overtime rates or agency rates.

**Penalty Weights:**
- Actual OT (>40h): Weight = 1.0 (normalized so 12 hours OT = 1.0 penalty)
- Extra hours (≤40h): Weight = 0.3

### 4.2 Weekend Shifts Required *(NEW)*
- **Rule:** Each staff member must work a minimum number of weekend shifts per schedule period
- **Default:** 3 weekend shifts per 6-week schedule
- **Configurable:** Yes, per unit
- **Exemption:** Staff marked as "Weekend Exempt" are excluded
- **Penalty:** Proportional to shortfall (e.g., 2 short = higher penalty than 1 short)

### 4.3 Consecutive Weekends Penalty *(NEW)*
- **Rule:** Penalize staff who work more than the maximum consecutive weekends
- **Default Maximum:** 2 consecutive weekends
- **Penalty:** Applied per extra consecutive weekend
- **Purpose:** Ensures weekends are distributed fairly over time

### 4.4 Holiday Fairness *(NEW)*
- **Rule:** Holiday shifts should be distributed fairly among staff
- **Minimum Required:** 1 holiday shift per schedule period (configurable)
- **Penalties:**
  - Staff below minimum: Penalty proportional to shortfall
  - Staff significantly above average: Small penalty
- **Holidays Tracked:** New Year's Day, MLK Day, Presidents' Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas Eve, Christmas Day

### 4.5 Staff Preference Match
- **Rule:** Try to match staff to their preferred shifts and days
- **Preferences Tracked:**
  - Preferred shift type (Day, Night, Evening, Any)
  - Max hours per week
  - Max consecutive days
  - Preferred days off
  - Preferred pattern (e.g., "3on-4off", "4on-3off")
- **Penalty:** Applied when assignments don't match preferences

### 4.6 Float Penalty *(NEW)*
- **Rule:** Minimize floating staff to units other than their home unit
- **Penalty Levels:**
  | Scenario | Penalty |
  |----------|---------|
  | Float to unit where staff IS cross-trained | Low (0.3) |
  | Float to unit where staff is NOT cross-trained | High (1.0) |
- **Purpose:** Staff prefer working in familiar environments; cross-training makes floating less disruptive

### 4.7 Charge Nurse Distribution *(NEW)*
- **Rule:** Prevent too many charge-qualified nurses from clustering on the same shift
- **Logic:**
  1. Calculate average charge-qualified nurses per shift
  2. If a shift exceeds (average + 1), apply penalty
  3. Minimum threshold of 2
- **Purpose:** Keep charge nurses distributed so there's backup coverage across shifts

### 4.8 Skill Mix Diversity
- **Rule:** Each shift should have a mix of experience levels
- **Purpose:** Avoid having all senior or all junior staff on one shift
- **Penalty:** Applied when skill mix is unbalanced

---

## 5. Unit Configuration Options

Each unit (ICU, ER, Med-Surg, etc.) can have its own configuration:

| Setting | Description | Default |
|---------|-------------|---------|
| **Weekend Rule Type** | "count_per_period" or "alternate_weekends" | count_per_period |
| **Weekend Shifts Required** | Number of weekend shifts required per schedule period | 3 |
| **Schedule Period Weeks** | Length of scheduling period in weeks | 6 |
| **Holiday Shifts Required** | Minimum holiday shifts per period | 1 |
| **Max Consecutive Weekends** | Maximum consecutive weekends before penalty | 2 |
| **Escalation Sequence** | Order to try when filling callouts | Float → Per Diem → Overtime → Agency |
| **Acuity Yellow Extra Staff** | Additional staff needed at Yellow acuity | 1 |
| **Acuity Red Extra Staff** | Additional staff needed at Red acuity | 2 |
| **Low Census Order** | Order to send home during low census | Agency → Overtime → Per Diem → Full Time |
| **OT Approval Threshold** | Hours of OT requiring CNO approval | 4 |
| **Max On-Call Per Week** | Maximum on-call shifts per week | 1 |
| **Max On-Call Weekends Per Month** | Maximum on-call weekends per month | 1 |

---

## 6. Census Bands & Staffing

Census bands define staffing requirements based on patient count:

### Example: ICU Census Bands
| Band Name | Patients | Required RNs | Required LPNs | Required CNAs | Charge Nurses | Ratio |
|-----------|----------|--------------|---------------|---------------|---------------|-------|
| Low Census | 1-3 | 1 | 0 | 0 | 1 | 2:1 |
| Normal Census | 4-6 | 2 | 1 | 1 | 1 | 2:1 |
| High Census | 7-9 | 3 | 1 | 1 | 1 | 2:1 |
| Critical Census | 10-12 | 4 | 1 | 2 | 1 | 1:1 |

**Note:** Patient-to-nurse ratio is calculated using **licensed staff (RN + LPN)**, not just RNs.

---

## 7. Escalation & Callout Workflow

When a callout occurs (staff calls in sick, etc.), the system follows an escalation sequence to find a replacement:

### Default Escalation Sequence:
1. **Float Pool** - Check if float staff are available
2. **Per Diem (PRN)** - Contact available per diem staff
3. **Overtime** - Offer overtime to regular staff
4. **Agency** - Call agency as last resort

### Callout Reasons Tracked:
- Sick
- Family Emergency
- Personal
- No Show
- Other

### Callout Statuses:
- **Open** - Not yet filled
- **Filled** - Replacement found
- **Unfilled Approved** - Approved to run short-staffed

---

## 8. Low Census Policy

When census drops and staff need to be sent home, follow this order:

### Default Low Census Order:
1. **Agency** - Send home first (highest cost)
2. **Overtime** - Send home staff on OT
3. **Per Diem** - Send home PRN staff
4. **Full Time** - Send home full-time staff (rotated fairly based on Flex Hours YTD)

### Flex Tracking:
- System tracks flex hours year-to-date per staff member
- Used to ensure fair rotation of who gets sent home
- Staff with fewer flex hours YTD are more likely to be flexed next

---

## 9. Assignment Attributes

Each assignment (staff → shift) tracks:

| Attribute | Description |
|-----------|-------------|
| **Is Charge Nurse** | Whether this person is charge for this shift |
| **Is Overtime** | Whether this assignment is overtime |
| **Assignment Source** | How the assignment was created: Manual, Auto-Generated, Swap, Callout Replacement, Float, Agency Manual, Pull Back |
| **Is Float** | Whether staff is working outside their home unit |
| **Float From Unit** | Original unit if floating |
| **Safe Harbor Invoked** | If nurse accepted assignment under protest (Texas law) |
| **Agency Reason** | For agency: Callout, Acuity Spike, or Vacancy |
| **Status** | Assigned, Confirmed, Called Out, Swapped, Cancelled, Flexed |

---

## 10. Special Features

### 10.1 Shift Swap Requests
- Staff can request to swap shifts with each other
- Swaps require manager approval
- System validates that swap doesn't violate hard rules

### 10.2 Safe Harbor (Texas Law)
- Nurses can accept an assignment "under protest" if they feel it's unsafe
- This is tracked for legal/compliance purposes
- Links to a Safe Harbor form ID

### 10.3 Sitters
- Each shift can specify number of 1:1 sitters needed
- Sitters add to CNA requirements

---

## Review Checklist

Please review each section and note any changes needed:

- [ ] Section 1: Staff Attributes - Any changes?
- [ ] Section 2: Shift Types - Any changes?
- [ ] Section 3: Hard Rules - Any rules to add/remove/modify?
- [ ] Section 4: Soft Rules - Any rules to add/remove/modify? Penalty weights correct?
- [ ] Section 5: Unit Configuration - Any settings to add/change defaults?
- [ ] Section 6: Census Bands - Staffing ratios correct?
- [ ] Section 7: Escalation Workflow - Sequence correct?
- [ ] Section 8: Low Census Policy - Order correct?

---

*Document generated from CAH Scheduler codebase*
