# CAH Scheduler - Complete Rules Specification

**Document Version:** 1.2.4
**Last Updated:** February 19, 2026
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
9. [Assignment Attributes](#9-assignment-attributes)
10. [Special Features](#10-special-features)
11. [Application UI Guide](#11-application-ui-guide)

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
| **Voluntary Flex Available** | If true, staff is willing to go home voluntarily during low census (VTO) |

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
- **Applies to units:** ICU, ER, ED, Emergency (exact word match on unit name)
- **Note:** Unit matching uses word-boundary comparison, not substring matching. A unit named "Med-Surg" does **not** trigger this rule — "MED-SURG" must contain one of the supervised unit names as a complete word (e.g., "ICU", "ER", "ED", "EMERGENCY"). This prevents false positives on units whose names happen to contain supervised unit abbreviations as substrings.

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
- **Penalty:** Applied per extra consecutive weekend (0.8 per weekend over the limit)
- **Purpose:** Ensures weekends are distributed fairly over time
- **Weekend definition:** Saturday and Sunday of the same calendar weekend count as **one weekend**, not two. Working both days of the same weekend does not increment the consecutive weekend counter twice.

### 4.4 Holiday Fairness *(UPDATED)*
- **Rule:** Holiday shifts should be distributed fairly among staff **annually** (not per schedule period)
- **Tracking:** System maintains `staff_holiday_assignment` table to track yearly holiday assignments
- **Holiday Grouping:** Certain holidays are grouped together as one:
  - **Christmas:** Christmas Eve and Christmas Day count as ONE "Christmas" holiday. Working either day counts as "worked Christmas."
- **Penalties:**
  - Staff below yearly average: Penalty proportional to shortfall
  - Staff significantly above yearly average: Small penalty
- **Holidays Tracked:** New Year's Day, MLK Day, Presidents' Day, Memorial Day, Independence Day, Labor Day, Thanksgiving, Christmas (Eve + Day combined)

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
| **Low Census Order** | Order to send home during low census | Voluntary → Overtime → Per Diem → Full Time |
| **Callout Threshold Days** | Days before shift to classify as callout vs open shift | 7 |
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

## 7. Escalation & Coverage Workflow

The system handles coverage needs differently based on timing:

### 7.1 Callouts (Urgent - Within 7 Days)

When a staff member calls out or leave is approved within the callout threshold (default: 7 days), the system creates a **Callout** record. The manager follows the escalation sequence manually.

**Default Escalation Sequence:**
1. **Float Pool** - Check if float staff are available
2. **Per Diem (PRN)** - Contact available per diem staff
3. **Overtime** - Offer overtime to regular staff
4. **Agency** - Call agency as last resort

**Callout Reasons Tracked:**
- Sick
- Family Emergency
- Personal
- No Show
- Other

**Callout Statuses:**
- **Open** - Not yet filled
- **Filled** - Replacement found
- **Unfilled Approved** - Approved to run short-staffed

### 7.2 Coverage Requests (Advance Notice - Beyond 7 Days) *(NEW in v1.2.1)*

When leave is approved more than 7 days before the shift, the system **automatically finds replacement candidates** and presents them for manager approval.

**Automatic Candidate Finding Process:**
1. System searches for available staff following the escalation ladder
2. For each potential candidate, the system checks:
   - Availability (not on leave, not already assigned)
   - Qualifications (unit, competency level)
   - Hours worked this week (overtime check)
   - Rest requirements (10-hour minimum)
   - 60-hour weekly limit
3. Top 3 candidates are ranked and presented with reasons

**Candidate Ranking Criteria:**
| Source | Priority Score | Notes |
|--------|---------------|-------|
| Float Pool | Highest (100+) | Designed for coverage |
| PRN (Available) | High (80+) | Marked date as available |
| Regular Staff (OT) | Medium (60+) | Overtime may apply |
| Agency | Lowest (10) | External, highest cost |

**Within each source, candidates are ranked by:**
- Unit qualification (home unit > cross-trained)
- Competency level (higher = better)
- Reliability rating (1-5 scale)
- Flex hours YTD (lower = fairer distribution)

**Reasons Provided for Each Candidate:**
Each candidate recommendation includes explanatory reasons such as:
- "Float pool staff - designed for coverage"
- "Cross-trained for ICU"
- "PRN staff - marked available for this date"
- "High reliability rating (5/5)"
- "No overtime (within 40 hours)"
- "Low flex hours YTD (fair distribution)"

**Coverage Request Statuses:**
- **Pending Approval** - Waiting for manager to select a candidate
- **Approved** - Manager approved, assignment created
- **Filled** - Assignment confirmed and active
- **Cancelled** - Request cancelled
- **No Candidates** - No suitable candidates found (manual intervention needed)

---

## 8. Low Census Policy

When census drops and staff need to be sent home, follow this order:

### Default Low Census Order:
1. **Voluntary (VTO)** - Staff who have indicated willingness to go home (Voluntary Time Off)
2. **Overtime** - Send home staff on OT
3. **Per Diem** - Send home PRN staff
4. **Full Time** - Send home full-time staff (rotated fairly based on Flex Hours YTD)

**Note:** Agency staff are not included in the low census order because agency contracts typically guarantee minimum hours. Sending agency home may still incur costs.

### Voluntary Time Off (VTO):
- Staff can indicate they are "Available for VTO" via the Staff page
- These staff are prioritized first when low census requires sending people home
- VTO is voluntary and based on staff preference
- VTO indicator can be toggled on/off by staff or managers

### Flex Tracking:
- System tracks flex hours year-to-date per staff member
- Used to ensure fair rotation of who gets sent home
- Staff with fewer flex hours YTD are more likely to be flexed next
- Within each category (VTO, OT, PRN, FT), staff are sorted by flex hours YTD (lowest first)

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

## 11. Application UI Guide

The CAH Scheduler application provides the following pages for managing scheduling:

### 11.1 Main Pages

| Page | URL | Description |
|------|-----|-------------|
| **Setup** | `/setup` | Import data from Excel - upload staff, units, and holidays from a spreadsheet |
| **Dashboard** | `/dashboard` | Overview of current schedule status, pending items, and key metrics |
| **Staff** | `/staff` | Manage all staff members - add, edit, view competency levels, employment types, certifications |
| **Schedule** | `/schedule` | View and edit the schedule grid, make assignments, see coverage |
| **Scenarios** | `/scenarios` | Compare different scheduling scenarios and their scores |
| **Callouts** | `/callouts` | Log and manage staff callouts, track replacements and escalation |
| **Coverage** | `/open-shifts` | Review and approve replacement candidates for shifts needing coverage (auto-recommended by system) |
| **Audit Trail** | `/audit` | View all changes made to the system with timestamps and details |

### 11.2 Request Management Pages

| Page | URL | Description |
|------|-----|-------------|
| **Leave Management** | `/leave` | View, approve, or deny leave requests (vacation, sick, maternity, etc.). Create new leave requests for staff. Filter by status: All, Pending, Approved, Denied. **When leave is approved, affected shifts automatically have replacement candidates found.** |
| **Coverage** | `/open-shifts` | Review auto-recommended replacement candidates for shifts needing coverage. Shows top 3 candidates with reasons. Manager approves one candidate to auto-create the assignment. Filter by: Pending, Filled, Cancelled, All. |
| **Shift Swaps** | `/swaps` | View, approve, or deny shift swap requests between staff. Shows requesting staff, their shift, target staff, and target shift. |
| **PRN Availability** | `/availability` | View per-diem (PRN) staff availability submissions. See which dates each PRN staff is available. Highlights staff who haven't submitted availability yet. |

### 11.3 Configuration Pages

| Page | URL | Description |
|------|-----|-------------|
| **Rules** | `/rules` | View and configure scheduling rules (hard rules and soft rules with penalties) |
| **Unit Configuration** | `/settings/units` | Configure per-unit settings including: weekend shift requirements, holiday requirements, callout escalation order, low census order, acuity staffing levels, OT approval thresholds, on-call limits |
| **Holidays** | `/settings/holidays` | Manage public holidays that affect scheduling. Add standard US holidays with one click. Holidays affect fairness calculations. |

### 11.4 Navigation

All pages are accessible from the left sidebar. The navigation order is:
1. Dashboard
2. Staff
3. Schedule
4. Scenarios
5. Callouts
6. Coverage
7. Leave
8. Shift Swaps
9. PRN Availability
10. Rules
11. Units
12. Holidays
13. Audit Trail
14. Setup (Import/Export Data)

### 11.5 Common Actions

| Action | Where | How |
|--------|-------|-----|
| **Import Data from Excel** | `/setup` | Download template, fill with your data, upload, review preview, click "Import Data" |
| **Download Excel Template** | `/setup` | Click "Download Template" to get pre-formatted spreadsheet |
| **Approve/Deny Leave** | `/leave` | Click "Approve" or "Deny" button on pending requests. Approval auto-finds replacement candidates for affected assignments. |
| **Approve Coverage** | `/open-shifts` | Click "Review" to see top 3 candidates with reasons, then click "Approve" on your choice |
| **View Staff Calendar** | `/staff` | Click on a staff member's name to see their day-by-day calendar view |
| **Approve/Deny Swap** | `/swaps` | Click "Approve" or "Deny" button on pending swap requests |
| **Create Leave Request** | `/leave` | Click "New Leave Request" button, fill form |
| **View PRN Availability** | `/availability` | See calendar of available dates per PRN staff |
| **Configure Unit Rules** | `/settings/units` | Click "Edit" on a unit to modify its scheduling rules |
| **Add Holidays** | `/settings/holidays` | Click "Add Standard Holidays" for US holidays or "Add Holiday" for custom |
| **Log Callout** | `/callouts` | Click "Log Callout" and follow escalation workflow |
| **View Audit History** | `/audit` | Filter by action type, date range, or entity |
| **Set Shift Census** | `/schedule/[id]` | Click on a shift cell, enter patient census in the dialog, click "Update" - staffing requirements adjust based on census bands |
| **View Staff Preferences** | `/staff` | Click on a staff member's name to open detail dialog - see shift preferences, max hours, preferred days off, etc. |
| **Export Data to Excel** | `/setup` | Click "Export Data" to download current database data (Staff, Units, Holidays, Census Bands) as Excel file |

---

## Review Checklist

Please review each section and note any changes needed:

- [ ] Section 1: Staff Attributes - Any changes to roles, employment types, or competency levels?
- [ ] Section 2: Shift Types - Any changes to shift definitions or acuity levels?
- [ ] Section 3: Hard Rules - Any rules to add/remove/modify? Are all 13 rules correct?
- [ ] Section 4: Soft Rules - Any rules to add/remove/modify? Penalty weights correct?
- [ ] Section 5: Unit Configuration - Any settings to add/change defaults?
- [ ] Section 6: Census Bands - Staffing ratios correct for your units?
- [ ] Section 7: Escalation Workflow - Callout escalation sequence correct?
- [ ] Section 8: Low Census Policy - Order for sending staff home correct?
- [ ] Section 9: Assignment Attributes - Any additional tracking needed?
- [ ] Section 10: Special Features - Any features missing?
- [ ] Section 11: UI Guide - Any additional pages or features needed?

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial document with all rules and configuration options |
| 1.1 | Feb 13, 2026 | Added Section 11 (Application UI Guide) documenting all available pages: Leave Management, Shift Swaps, PRN Availability, Unit Configuration, and Holidays Management |
| 1.2 | Feb 15, 2026 | **Major updates based on expert feedback:** (1) Holiday fairness now tracks annually, Christmas Eve/Day merged as one holiday; (2) Low census order updated - removed Agency, added Voluntary Time Off (VTO); (3) Added Coverage page for managing shifts needing coverage; (4) Leave approval now auto-creates coverage requests for affected assignments; (5) Staff page now shows clickable calendar view for each staff member; (6) Added callout threshold days configuration |
| 1.2.1 | Feb 15, 2026 | **Coverage auto-fill workflow:** Leave approval (> 7 days) now automatically finds top 3 replacement candidates instead of creating manual open shifts. Each candidate includes reasons (e.g., "Cross-trained for ICU", "High reliability"). Manager reviews and approves, assignment is auto-created. Renamed "Open Shifts" to "Coverage" in navigation. |
| 1.2.2 | Feb 16, 2026 | **Census & Preferences visibility:** (1) Census input added to shift assignment dialog - determines required staffing via census bands; (2) Staff count display fixed to show scheduled/required based on census; (3) Staff detail dialog now shows shift preferences; (4) Census Bands added to Excel import/export |
| 1.2.3 | Feb 18, 2026 | **Staff preferences in Excel:** Staff preferences can now be imported/exported via Excel. New columns in Staff sheet: Preferred Shift, Preferred Days Off, Max Consecutive Days, Max Hours Per Week, Avoid Weekends |

---

*Document generated from CAH Scheduler codebase*
