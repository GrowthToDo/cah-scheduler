# Changelog

All notable changes to the CAH Scheduler project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.3.0] - 2026-02-15

### Summary

This release adds an **Excel Import** feature that allows hospitals to bootstrap the system with their existing staff data from spreadsheets. Instead of manually entering each staff member, unit, and holiday, users can now upload a single Excel file to import everything at once.

---

### New Feature: Excel Data Import

#### The Problem

Hospitals typically have their staff information stored in Excel spreadsheets. Manually entering 30+ staff members through the UI is time-consuming and error-prone.

#### The Solution

A new **Setup** page (`/setup`) allows users to:

1. **Download a template** - Pre-formatted Excel file with 3 sheets
2. **Fill in their data** - Staff, Units, Holidays
3. **Upload and validate** - System checks for errors before importing
4. **Import with one click** - Deletes existing data and imports fresh

---

### Excel Template Format

**Sheet 1: Staff**
| Column | Required | Example |
|--------|----------|---------|
| First Name | Yes | Maria |
| Last Name | Yes | Garcia |
| Role | Yes | RN / LPN / CNA |
| Employment Type | Yes | full_time / part_time / per_diem / float / agency |
| FTE | No | 1.0 (default) |
| Home Unit | No | ICU |
| Cross-Trained Units | No | ER, Med-Surg (comma-separated) |
| Competency Level | No | 1-5 (default 3) |
| Charge Nurse Qualified | No | Yes / No |
| Reliability Rating | No | 1-5 (default 3) |
| Email | No | email@hospital.com |
| Phone | No | 555-0101 |
| Hire Date | No | YYYY-MM-DD |
| Weekend Exempt | No | Yes / No |
| VTO Available | No | Yes / No |
| Notes | No | Free text |

**Sheet 2: Units**
| Column | Required | Example |
|--------|----------|---------|
| Name | Yes | ICU |
| Description | No | Intensive Care Unit |
| Min Staff Day | Yes | 4 |
| Min Staff Night | Yes | 3 |
| Weekend Shifts Required | No | 3 (default) |
| Holiday Shifts Required | No | 1 (default) |

**Sheet 3: Holidays**
| Column | Required | Example |
|--------|----------|---------|
| Name | Yes | Christmas Day |
| Date | Yes | 2026-12-25 |

---

### How It Works

#### Step 1: Download Template
- Click "Download Template" on the Setup page
- Opens Excel file with example data
- Three sheets: Staff, Units, Holidays

#### Step 2: Fill In Your Data
- Replace example rows with your actual data
- Required fields must be filled
- Optional fields can be left blank (defaults applied)

#### Step 3: Upload and Validate
- Drag and drop or click to upload
- System parses and validates every row
- Shows preview with counts:
  - "28 Staff, 3 Units, 9 Holidays"
- Displays any errors (must be fixed) or warnings (informational)

#### Step 4: Import
- Click "Import Data"
- Confirmation dialog warns about data deletion
- System deletes ALL existing data
- Imports new data from Excel
- Auto-creates: shift definitions, rules, census bands

---

### What Gets Imported

**From Excel:**
- Staff members (with auto-created preferences)
- Units (with default configuration)
- Holidays

**Auto-Generated Defaults:**
- Day Shift (7am-7pm, 12 hours)
- Night Shift (7pm-7am, 12 hours)
- 21 scheduling rules (13 hard, 8 soft)
- Census bands for first unit

---

### Validation

**Errors (block import):**
- Missing required fields (First Name, Last Name, Role, etc.)
- Invalid enum values (e.g., "Nurse" instead of "RN")
- Invalid numbers (e.g., FTE > 1.0)

**Warnings (informational):**
- Missing optional fields (e.g., no email)
- Missing sheets (e.g., no Holidays sheet)

---

### Files Added

| File | Purpose |
|------|---------|
| `src/app/setup/page.tsx` | Setup page with upload UI |
| `src/app/api/import/route.ts` | API for file processing |
| `src/lib/import/parse-excel.ts` | Excel parsing and validation |

### Files Modified

| File | Change |
|------|--------|
| `src/components/layout/sidebar.tsx` | Added "Setup" link |
| `package.json` | Added `xlsx` dependency |

---

### Dependencies Added

```
xlsx: ^0.18.5
```

The `xlsx` (SheetJS) library handles Excel file parsing in the browser and server.

---

## [1.2.1] - 2026-02-15

### Summary

This release corrects the leave approval workflow based on expert feedback from Pradeep. The key change is that the system now **automatically finds and recommends replacement candidates** instead of creating open shifts that wait for manual assignment.

---

### What Changed: Coverage Auto-Fill Workflow

#### The Problem with v1.2.0

In v1.2.0, when leave was approved more than 7 days before a shift, the system created an "Open Shift" record. The manager then had to:
1. Go to the Open Shifts page
2. Manually search for available staff
3. Evaluate each candidate
4. Assign someone

This was still a manual, time-consuming process.

#### The Solution in v1.2.1

Now, when leave is approved more than 7 days before a shift:

1. **System automatically searches** for replacement candidates
2. **Follows the escalation ladder**: Float Pool → PRN → Overtime → Agency
3. **Ranks candidates** by suitability (qualifications, availability, fairness)
4. **Presents top 3 candidates** with explanatory reasons
5. **Manager reviews and clicks "Approve"**
6. **Assignment is created automatically**

---

### How the Candidate Finding Algorithm Works

The new `findCandidatesForShift()` function in `src/lib/coverage/find-candidates.ts`:

#### Step 1: Check Float Pool Staff
- Queries all active float pool staff
- Checks each for availability on the shift date
- Verifies they're qualified for the unit (home unit or cross-trained)
- Calculates hours this week to determine overtime

#### Step 2: Check PRN Staff
- Queries all active PRN (per diem) staff
- Only considers those who **marked this date as available**
- Verifies unit qualification
- Checks all scheduling rules (rest time, 60-hour limit, etc.)

#### Step 3: Check Regular Staff for Overtime
- Queries full-time and part-time staff
- Identifies those not already scheduled
- Calculates if this would push them into overtime (>40 hours)
- Considers flex hours YTD for fairness

#### Step 4: Agency Option
- Always included as a fallback
- Marked as "requires external contact"
- Lowest priority score (last resort)

#### Ranking Criteria

Each candidate receives a score based on:

| Factor | Score Impact |
|--------|--------------|
| **Source Priority** | Float (100) > PRN (80) > OT (60) > Agency (10) |
| **Unit Match** | Home unit (+10) > Cross-trained (+0) |
| **Competency Level** | Higher level = higher score |
| **Reliability Rating** | 5/5 = +15, 1/5 = +3 |
| **Overtime** | Non-OT preferred (+15 if within 40h) |
| **Flex Hours YTD** | Lower flex hours = higher score (fairness) |

#### Reasons Provided

Each candidate includes human-readable reasons. Examples:

**Float Pool Candidate:**
- "Float pool staff - designed for coverage"
- "Cross-trained for ICU"
- "Competency Level 4 (Proficient)"
- "Reliability rating: 5/5"

**PRN Candidate:**
- "PRN staff - marked available for this date"
- "Home unit is ICU"
- "High reliability rating (4/5)"

**Overtime Candidate:**
- "Would be overtime (OT pay applies)"
- "Cross-trained for ICU"
- "Low flex hours YTD (fair distribution)"

---

### UI Changes

#### Sidebar Navigation
- Renamed: "Open Shifts" → **"Coverage"**
- Same URL: `/open-shifts`

#### Coverage Page (`/open-shifts`)

**Before (v1.2.0):**
- Table with open shifts
- "Fill" button opened a dialog to manually select staff
- No recommendations

**After (v1.2.1):**
- Table shows pending coverage requests
- "Top Recommendation" column shows best candidate
- "Review" button opens detailed view with top 3 candidates
- Each candidate shows:
  - Name and source (Float Pool, PRN, Overtime, Agency)
  - Color-coded badge (blue for Float, green for PRN, etc.)
  - List of reasons with checkmarks
  - Hours this week + overtime indicator
- "Approve" button next to each candidate
- Clicking "Approve" creates the assignment automatically

---

### Database Schema Changes

**Modified `open_shift` table:**

| New Column | Type | Purpose |
|------------|------|---------|
| `recommendations` | JSON | Stores top 3 candidates with reasons |
| `escalation_steps_checked` | JSON | Array of sources checked (e.g., ["float", "per_diem", "overtime"]) |
| `selected_staff_id` | TEXT | Staff ID chosen by manager |
| `selected_source` | TEXT | Source of chosen staff (float, per_diem, overtime, agency) |
| `approved_at` | TEXT | Timestamp of approval |
| `approved_by` | TEXT | Who approved |

**Modified `status` enum:**
- Old: `open`, `filled`, `cancelled`
- New: `pending_approval`, `approved`, `filled`, `cancelled`, `no_candidates`

---

### API Changes

#### `PUT /api/open-shifts/[id]`

**New action: `approve`**

```json
{
  "action": "approve",
  "selectedStaffId": "staff-uuid-here"
}
```

Response:
- Creates assignment automatically
- Updates coverage request status to "filled"
- Logs audit trail entry

---

### Files Added/Modified

| File | Change |
|------|--------|
| `src/lib/coverage/find-candidates.ts` | **NEW** - Candidate finding algorithm |
| `src/db/schema.ts` | Added new fields to `open_shift` table |
| `src/app/api/staff-leave/[id]/route.ts` | Calls `findCandidatesForShift()` on approval |
| `src/app/api/open-shifts/route.ts` | Returns recommendation fields |
| `src/app/api/open-shifts/[id]/route.ts` | Added `approve` action |
| `src/app/open-shifts/page.tsx` | Complete rewrite for approval workflow |
| `src/components/layout/sidebar.tsx` | Renamed to "Coverage" |

---

### Testing the New Workflow

1. **Create a staff member with scheduled shifts** (at least 8+ days out)
2. **Approve leave** that covers one of those shift dates
3. **Go to Coverage page** (`/open-shifts`)
4. **Verify** the request shows "Pending Approval" status
5. **Click "Review"** to see top 3 candidates with reasons
6. **Click "Approve"** on your chosen candidate
7. **Verify** the assignment was created in the schedule

---

## [1.2.0] - 2026-02-15

### Overview

This release implements 5 major features based on expert feedback from field testing. These changes improve holiday fairness tracking, low census management, shift visibility, leave workflow integration, and staff schedule viewing.

---

### New Features

#### 1. Open Shifts Page (`/open-shifts`)

A new page for managing shifts that need coverage due to leave approvals or callouts.

**What it does:**
- Displays all shifts needing coverage in a filterable table
- Shows shift details: date, time, unit, original staff, reason, priority
- Filter tabs: Open, Filled, Cancelled, All
- "Fill" action opens a dialog to assign a replacement staff member
- "Cancel" action removes the open shift from the queue
- Automatically creates assignments when shifts are filled
- Full audit trail integration for all actions

**Why it matters:**
- Provides a centralized view of all coverage needs
- Streamlines the process of finding and assigning replacements
- Connects leave approvals to operational coverage needs

**Files:**
- `src/app/open-shifts/page.tsx` - Main page component
- `src/app/api/open-shifts/route.ts` - GET/POST endpoints
- `src/app/api/open-shifts/[id]/route.ts` - GET/PUT/DELETE endpoints
- `src/components/layout/sidebar.tsx` - Navigation link added

---

#### 2. Staff Calendar View

Clicking a staff member's name now opens a calendar showing their day-by-day schedule.

**What it does:**
- Calendar grid displays the current month with navigation
- Color-coded days:
  - **Blue** - Day shift assigned
  - **Purple** - Night shift assigned
  - **Green** - On approved leave
  - **Gray** - Off / not scheduled
- Shows staff summary: role, employment type, home unit, FTE
- Default view: current schedule period
- Click arrows to navigate months

**Why it matters:**
- Quickly see a staff member's complete schedule at a glance
- Identify coverage gaps and overwork patterns
- Understand staff availability before making assignments

**Files:**
- `src/components/staff/staff-calendar.tsx` - Calendar component
- `src/components/staff/staff-detail-dialog.tsx` - Dialog wrapper
- `src/app/api/staff/[id]/schedule/route.ts` - Schedule data API
- `src/components/staff/staff-table.tsx` - Name click handler
- `src/app/staff/page.tsx` - Dialog state management

---

#### 3. Shift Violations Modal

The issues badge on shifts is now clickable, showing detailed violation information.

**What it does:**
- Click the red badge on any shift to see violation details
- Modal displays violations in two sections:
  - **Hard Rule Violations** (red) - Must be fixed before publishing
  - **Soft Rule Violations** (yellow) - Preferences/penalties that can be overridden
- Each violation shows:
  - Rule name
  - Description of the issue
  - Penalty score (for soft violations)
- Click on shift cell still opens assignment dialog (unchanged behavior)

**Why it matters:**
- Managers can understand exactly what's wrong with a shift
- Distinguishes between critical issues and minor preferences
- Helps prioritize which problems to address first

**Files:**
- `src/components/schedule/shift-violations-modal.tsx` - Modal component
- `src/components/schedule/schedule-grid.tsx` - Badge click handler
- `src/app/schedule/[id]/page.tsx` - Modal state and violation data

---

### Changed Features

#### 4. Leave Approval Workflow - Now Creates Open Shifts/Callouts

When leave is approved, the system now automatically handles affected shifts.

**What it does:**
- When leave is approved, finds all assignments during the leave period
- For each affected shift:
  - If shift is **within threshold** (default: 7 days) → Creates a **Callout** (urgent)
  - If shift is **beyond threshold** → Creates an **Open Shift** (for scheduled pickup)
- Original assignments are automatically cancelled
- Full audit trail of all changes

**Configuration:**
- `calloutThresholdDays` setting on Unit configuration (default: 7)
- Can be customized per unit

**Why it matters:**
- Eliminates manual step of creating callouts after approving leave
- Ensures no shifts are forgotten when approving time off
- Distinguishes between urgent last-minute needs and advance planning

**Files:**
- `src/app/api/staff-leave/[id]/route.ts` - Enhanced with `handleLeaveApproval()`
- `src/db/schema.ts` - Added `calloutThresholdDays` to unit table

---

#### 5. Holiday Fairness - Now Tracks Annually

Holiday assignment tracking has been changed from per-schedule-period to annual tracking.

**What it does:**
- New `staff_holiday_assignment` table tracks all holiday assignments across the year
- Fairness evaluation compares each staff member's yearly total against the average
- Christmas Eve and Christmas Day are now grouped as ONE "Christmas" holiday
  - Working either day counts as "worked Christmas"
  - Prevents double-counting during evaluation

**Why it matters:**
- Fairer distribution over longer time periods
- Staff who worked holidays early in the year get recognition all year
- Christmas tracking is more realistic (most people work Eve OR Day, not both)

**Files:**
- `src/db/schema.ts` - Added `staff_holiday_assignment` table
- `src/lib/engine/rules/weekend-holiday-fairness.ts` - Rewritten with annual logic and `HOLIDAY_GROUPS`
- `src/app/api/schedules/[id]/assignments/route.ts` - Tracks holiday assignments on create/delete

**Holiday Groups:**
```typescript
const HOLIDAY_GROUPS: Record<string, string> = {
  "Christmas Eve": "Christmas",
  "Christmas Day": "Christmas",
};
```

---

#### 6. Low Census Order - Removed Agency, Added VTO

The low census priority order has been updated based on operational feedback.

**Previous Order:**
1. Agency (removed - contracts guarantee hours)
2. Overtime
3. Per Diem
4. Full Time

**New Order:**
1. **Voluntary (VTO)** - Staff who opted in for voluntary time off
2. Overtime
3. Per Diem
4. Full Time

**New Staff Attribute:**
- `voluntaryFlexAvailable` (boolean) - Staff can indicate they're willing to go home voluntarily
- Displayed as "VTO" badge on staff table
- Configurable in staff edit form

**Why it matters:**
- Agency staff have contracts guaranteeing minimum hours - sending them home doesn't save money
- Voluntary time off respects staff preferences while meeting operational needs
- Staff appreciate choice in low census situations

**Files:**
- `src/db/schema.ts` - Added `voluntaryFlexAvailable` to staff table
- `src/db/seed.ts` - Updated default low census order
- `src/app/settings/units/page.tsx` - Updated UI default
- `src/components/staff/staff-form.tsx` - Added VTO checkbox
- `src/components/staff/staff-table.tsx` - Added VTO badge
- `src/types/staff.ts` - Added field to type
- `src/app/api/staff/route.ts` - Handle VTO field
- `src/app/api/staff/[id]/route.ts` - Handle VTO field

---

### Database Schema Changes

#### New Tables

**`staff_holiday_assignment`**
```sql
CREATE TABLE staff_holiday_assignment (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  holiday_name TEXT NOT NULL,  -- "Christmas", "Thanksgiving", etc.
  year INTEGER NOT NULL,
  shift_id TEXT REFERENCES shift(id),
  assigned_at TEXT NOT NULL
);
```

**`open_shift`**
```sql
CREATE TABLE open_shift (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL REFERENCES shift(id),
  original_staff_id TEXT NOT NULL REFERENCES staff(id),
  original_assignment_id TEXT REFERENCES assignment(id),
  reason TEXT NOT NULL,  -- "leave_approved", "callout", etc.
  reason_detail TEXT,
  status TEXT DEFAULT 'open',  -- "open", "filled", "cancelled"
  priority TEXT DEFAULT 'normal',  -- "low", "normal", "high", "urgent"
  created_at TEXT NOT NULL,
  filled_at TEXT,
  filled_by_staff_id TEXT REFERENCES staff(id),
  filled_by_assignment_id TEXT REFERENCES assignment(id),
  notes TEXT
);
```

#### Modified Tables

**`staff`**
- Added: `voluntary_flex_available` (boolean, default false)

**`unit`**
- Added: `callout_threshold_days` (integer, default 7)

**`exception_log`**
- Added entity types: `"open_shift"`, `"staff_holiday_assignment"`
- Added actions: `"open_shift_created"`, `"open_shift_filled"`, `"open_shift_cancelled"`, `"assignment_cancelled_for_leave"`, `"callout_created_for_leave"`

---

### UI Navigation Update

The sidebar now includes:
1. Dashboard
2. Staff
3. Schedule
4. Scenarios
5. Callouts
6. **Open Shifts** (NEW)
7. Leave
8. Shift Swaps
9. PRN Availability
10. Rules
11. Units
12. Holidays
13. Audit Trail

---

### Documentation Updates

- `RULES_SPECIFICATION.md` - Updated to version 1.2 with all changes
- `docs/05-scheduling-rules.md` - Updated holiday fairness section
- `docs/07-handling-callouts.md` - Added open shifts and VTO sections
- `docs/08-configuration.md` - Added new settings documentation
- `docs/09-using-the-app.md` - Added Open Shifts page and Staff Calendar
- `docs/10-glossary.md` - Added VTO, Open Shift terms

---

### Migration Notes

#### For Existing Deployments

1. **Database Migration Required**
   - New tables need to be created (`staff_holiday_assignment`, `open_shift`)
   - New columns need to be added to `staff` and `unit` tables
   - Run `npx drizzle-kit push` or apply migrations manually

2. **Low Census Order**
   - Existing units will keep their current `lowCensusOrder`
   - New units will use the updated default: `["voluntary", "overtime", "per_diem", "full_time"]`
   - Update existing units manually if desired

3. **Holiday Tracking**
   - Historical holiday assignments before this update are not tracked
   - Annual fairness tracking starts fresh from this deployment
   - First full year of data will establish baseline

4. **Staff VTO Setting**
   - All existing staff default to `voluntaryFlexAvailable = false`
   - Staff can update their preference via the staff form
   - Managers can update on behalf of staff

---

### Technical Details

**Dependencies:** No new dependencies added

**API Changes:**
- `GET /api/open-shifts` - List all open shifts with shift/staff details
- `POST /api/open-shifts` - Create new open shift
- `GET /api/open-shifts/[id]` - Get single open shift
- `PUT /api/open-shifts/[id]` - Fill or cancel open shift
- `DELETE /api/open-shifts/[id]` - Delete open shift
- `GET /api/staff/[id]/schedule` - Get staff schedule for date range
- `PUT /api/staff-leave/[id]` - Enhanced to auto-create open shifts/callouts

**Breaking Changes:** None

---

## [1.1.0] - 2026-02-13

### Added
- Section 11 (Application UI Guide) in RULES_SPECIFICATION.md
- Documentation for Leave Management, Shift Swaps, PRN Availability pages
- Documentation for Unit Configuration and Holidays Management pages

---

## [1.0.0] - 2026-02-01

### Added
- Initial release of CAH Scheduler
- Complete scheduling rule engine with hard and soft rules
- Staff management with competency levels
- Shift and assignment management
- Callout logging and escalation workflow
- Leave request management
- Shift swap functionality
- PRN availability tracking
- Unit configuration
- Holiday management
- Audit trail
- Scenario comparison

---

*For questions about this release, please open an issue on GitHub.*
