# Project Scope: Task Management & Time Utilization System

## 1. Project Overview
This web application helps teams track tasks, log daily working hours, and check work capacity (FTE / Time & Activity Utilization). 

The goal is to give managers and employees a simple, clear view of:
- What tasks need to be done.
- Who is working on each task.
- How much time is spent on work.
- If an employee is under capacity, at capacity, or working overtime.

---

## 2. User Roles
The system has four user roles:

1. **Admin:**
   - Has full access to the entire system and all departments.
   - Adds and manages user accounts, organizational departments, and functional groups.
   - Sets up company-wide work schedules and department maintenance tables.
   - Views complete organization reports and data exports.

2. **Manager (General / Operations Manager):**
   - Oversees work across multiple departments and teams.
   - Monitors overall company workload, capacity, and project progress.
   - Reviews high-level utilization reports to help balance staff and tasks.
   - Can create and assign tasks across different groups.

3. **Dept Manager (Department Manager):**
   - Leads and manages employees inside their specific department.
   - Creates, assigns, edits, and reorders department tasks.
   - Approves or rejects time correction requests submitted by their team.
   - Views department capacity and individual employee work hours.
   - Adjusts work schedule settings for department members.

4. **Task User (Employee):**
   - Views tasks assigned to them.
   - Uses real-time timers or manual entry to log time worked on tasks.
   - Updates task progress and status (Not Started, In Progress, On Hold, Completed).
   - Tracks personal daily hours and utilization compared to target hours.
   - Submits time correction requests if hours were logged incorrectly.

---

## 3. In-Scope Features

### A. Task Management
- **Task List & Board:** View tasks in a clean list or board format.
- **Task Details:** Set task title, description, category, priority (Low, Medium, High, Urgent), due date, and planned hours.
- **Assignment:** Assign tasks to specific employees within departments.
- **Task Status Flow:** Update tasks through standard statuses (Not Started, In Progress, In Review, Completed, Blocked).
- **Filtering & Search:** Quick search by task name, assignee, priority, status, or date range.

### B. Time Tracking & Timers
- **Live Stopwatch Timer:** Start, pause, resume, and stop a real-time timer while working on a task.
- **Manual Time Entry:** Add hours worked directly if a timer was not used.
- **Break Time:** Track break time separately so it does not count as productive work.
- **Time Correction Workflow:** Employees can submit time adjustment requests with a reason; managers review and approve or reject them.

### C. Work Schedules & Capacity Baseline
- **Daily Shift Settings:** Set start time, end time, and total shift hours (default: 8:30 AM to 6:30 PM, 10-hour shift).
- **Scheduled Lunch Break:** Deducts a 1-hour lunch break to get the net daily working hours (default: 9 net hours per day).
- **Working Days:** Select active workdays (Monday through Friday).

### D. Time & Activity Utilization (Capacity)
- **Time Periods:** View data by Day (default view), Week, Month, Quarter, Year, or Custom Date Range.
- **Key Capacity Numbers:**
  - **Working Days:** Number of active working days in the period (excluding weekends).
  - **Target Hours:** Required productive hours (e.g., Working Days × 9h/day).
  - **Actual Hours:** Total verified hours logged on tasks.
  - **Remaining Hours:** Remaining hours left to hit the target.
  - **Utilization %:** Percentage of capacity completed (Actual Hours ÷ Target Hours × 100).
- **Status Indicators:** Clear badges showing if someone is:
  - *Under Capacity* (needs more tasks assigned)
  - *At Capacity* (healthy workload)
  - *Over Capacity* (risk of burnout)
- **Employee Ledger & Drilldown:** Click any employee to see a detailed day-by-day table showing daily tracked time, daily target, variance, and individual task items.

### E. Department Management
- Create and manage department names, codes, and functional groups.
- Set workload threshold percentages (under, optimal, and over capacity ranges).

### F. Data Export
- Download utilization reports and employee details to Excel/CSV format for offline reporting and meetings.

---

## 4. Out-of-Scope (Not Included)
To keep the application focused, the following items are outside the current project scope:
- **Holiday Calendar Module:** Removed from Admin maintenance; scheduling focuses on standard shift and working days calculations.
- **Task Name Maintenance Table:** Removed from Admin maintenance; task names are designated freely during task creation and editing.
- **Payroll Processing:** No direct salary, tax, or payout calculations.
- **Biometric Device Integration:** No direct sync with physical fingerprint scanners or RFID badge turnstiles.
- **Direct Client Invoicing:** No billing or invoice generation tools for external clients.
- **Native Mobile Apps:** The app runs as a responsive web app in the browser, not as a standalone iOS/Android app store download.

---

## 5. Technology Stack
- **Frontend Framework:** React with TypeScript and Vite.
- **Styling:** Tailwind CSS (clean, responsive, easy-to-read layout).
- **Icons:** Lucide React icons.
- **Storage:** Browser local storage (fast setup, offline-friendly, no complicated database server required).
