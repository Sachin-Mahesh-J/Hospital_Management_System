# HMS Manual QA Results (Local, Pre-M17)

Status: **NOT STARTED**  
Tester:  
Date started:  
Date finished:  
Environment: local (`http://localhost:5173` + `http://localhost:5000` + `hms_development`)  
Document storage driver observed:  
Catalogs present (`medicines` / `lab_test_definitions`):  

This file is the execution log for `docs/qa/manual-qa-test-plan.md`.  
Do not mark PASS unless the case was manually executed. Automated tests are not evidence.

Verdicts: `PASS` | `FAIL` | `BLOCKED` | `NOT TESTED` | `N/A`

---

## Summary

```text
Total test cases: 440 numbered (plus Phase 2 matrix cells if recorded separately)
Passed: 0
Failed: 0
Blocked: 0
Not tested: 440
N/A: 0
```

Update these counts only after execution.

---

## Critical issues

_None recorded. Add only defects that prevent normal operation._

| ID | Case | Summary | Evidence |
| --- | --- | --- | --- |
| | | | |

---

## High issues

_None recorded. Add security, data-integrity, or core functionality defects._

| ID | Case | Summary | Evidence |
| --- | --- | --- | --- |
| | | | |

---

## Medium issues

_None recorded._

| ID | Case | Summary | Evidence |
| --- | --- | --- | --- |
| | | | |

---

## Low issues

_None recorded._

| ID | Case | Summary | Evidence |
| --- | --- | --- | --- |
| | | | |

---

## Deferred features (not bugs)

Copy from the test plan when encountered. Do not report these as failures.

- PDF future enhancements: mobile, patient portal, SMS/email, telemedicine, insurance, AI, biometrics
- Wards / beds / transfers (D-009)
- Admission charges (D-025)
- Tax/discount, stored PDF receipts, payment gateways
- Lab catalog write, cancel, PATCH, finalize, correct (D-023)
- Medicine catalog write is implemented by D-036; remaining pharmacy leftovers are expiry jobs and notifications
- Doctor/Nurse appointment ownership (D-021)
- Calendar drag/drop, recurrence, holidays (D-033)
- Leave balances, payroll, multi-level approval (D-029)
- Forgotten-password email, user delete, public registration (D-031)
- Malware scanning / quarantine / retention (D-030)
- Audit retention job (D-032)
- Granting admission update/discharge/cancel to any role (D-026)
- Analytics report CSV/PDF (D-027)
- Cloud deploy, backups, HA/DR as implemented product (D-034 / D-035 PENDING)

---

## Requirements gaps

_None recorded. Add only genuine gaps against approved requirements, not deferred items._

---

## Regression issues

_None recorded. Add anything previously working that now fails._

---

## Production blockers

_Candidate blockers from inspection (verify during execution; do not treat as scored FAILs until tested):_

1. No role can discharge or cancel an admission (approved D-026). Inpatient lifecycle cannot complete in production until a decision grants those permissions.
2. Local memory document driver cannot prove private object retrieval. Production must use Supabase private storage.
3. Empty medicine/lab catalogs block prescribing, laboratory, pharmacy, and related billing.
4. D-034 production operating policy and D-035 backup/DR policy are still pending.
5. Production cookie (`Secure; SameSite=None`), CORS, and CSRF behavior cannot be signed off from localhost alone.

---

## Accounts used

| Username | Role | Employee linked? | Notes / do not commit passwords |
| --- | --- | --- | --- |
| | administrator | | bootstrap |
| qa.admin2 | administrator | | |
| qa.reception | receptionist | | |
| qa.doctor | doctor | | |
| qa.nurse | nurse | | |
| qa.lab | laboratory_staff | | |
| qa.pharm | pharmacist | | |
| qa.account | accountant | | |
| qa.unlinked | | no | |
| qa.disabled | | | |
| qa.lockout | | | |

---

## Phase 2 RBAC matrix

Fill after Phase 2. Expected visibility is in the test plan.

| Feature | Admin | Doctor | Nurse | Receptionist | Lab | Pharmacist | Accountant |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nav matches expected table | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Direct URL denied pages | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| API denied 403 | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Patient create/update | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Appointment write | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Medical record write | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Prescription create/cancel | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Dispense | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Stock receive | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Invoice create/issue/pay | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Invoice void / payment reverse | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| User admin | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Audit | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Admission create | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Admission read | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Patient documents | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Leave create (if linked) | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Leave approve | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |
| Dashboard cards | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED |

---

## Case log

For each case: verdict, URL/endpoint, actual result, notes.

### Phase 0 — Environment

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P0-01 | NOT TESTED | | |
| P0-02 | NOT TESTED | | |
| P0-03 | NOT TESTED | | |
| P0-04 | NOT TESTED | | |
| P0-05 | NOT TESTED | | |
| P0-06 | NOT TESTED | | |
| P0-07 | NOT TESTED | | |
| P0-08 | NOT TESTED | | |
| P0-09 | NOT TESTED | | |
| P0-10 | NOT TESTED | | |
| P0-11 | NOT TESTED | | |
| P0-12 | NOT TESTED | | |
| P0-13 | NOT TESTED | | |
| P0-14 | NOT TESTED | | |
| P0-15 | NOT TESTED | | |

### Phase 1 — Authentication

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P1-01 | NOT TESTED | | |
| P1-02 | NOT TESTED | | |
| P1-03 | NOT TESTED | | |
| P1-04 | NOT TESTED | | |
| P1-05 | NOT TESTED | | |
| P1-06 | NOT TESTED | | |
| P1-07 | NOT TESTED | | |
| P1-08 | NOT TESTED | | |
| P1-09 | NOT TESTED | | |
| P1-10 | NOT TESTED | | |
| P1-11 | NOT TESTED | | |
| P1-12 | NOT TESTED | | |
| P1-13 | NOT TESTED | | |
| P1-14 | NOT TESTED | | |
| P1-15 | NOT TESTED | | |
| P1-16 | NOT TESTED | | |
| P1-17 | NOT TESTED | | |
| P1-18 | NOT TESTED | | |
| P1-19 | NOT TESTED | | |
| P1-20 | NOT TESTED | | |
| P1-21 | NOT TESTED | | |
| P1-22 | NOT TESTED | | |
| P1-23 | NOT TESTED | | |
| P1-24 | NOT TESTED | | |
| P1-25 | NOT TESTED | | |
| P1-26 | NOT TESTED | | |
| P1-27 | NOT TESTED | | |
| P1-28 | NOT TESTED | | |
| P1-29 | NOT TESTED | | |
| P1-30 | NOT TESTED | | |
| P1-31 | NOT TESTED | | |
| P1-32 | NOT TESTED | | |

### Phase 2 — RBAC role scripts and sensitive data

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P2-ADM | NOT TESTED | | |
| P2-DOC | NOT TESTED | | |
| P2-NUR | NOT TESTED | | |
| P2-REC | NOT TESTED | | |
| P2-LAB | NOT TESTED | | |
| P2-PHA | NOT TESTED | | |
| P2-ACC | NOT TESTED | | |
| P2-SENS-01 | NOT TESTED | | |
| P2-SENS-02 | NOT TESTED | | |
| P2-SENS-03 | NOT TESTED | | |
| P2-SENS-04 | NOT TESTED | | |
| P2-SENS-05 | NOT TESTED | | |
| P2-SENS-06 | NOT TESTED | | |

### Phase 3 — User administration

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P3-01 | NOT TESTED | | |
| P3-02 | NOT TESTED | | |
| P3-03 | NOT TESTED | | |
| P3-04 | NOT TESTED | | |
| P3-05 | N/A | | Users have no email field |
| P3-06 | NOT TESTED | | |
| P3-07 | NOT TESTED | | |
| P3-08 | NOT TESTED | | |
| P3-09 | NOT TESTED | | |
| P3-10 | NOT TESTED | | |
| P3-11 | NOT TESTED | | |
| P3-12 | NOT TESTED | | |
| P3-13 | NOT TESTED | | |
| P3-14 | NOT TESTED | | |
| P3-15 | NOT TESTED | | |
| P3-16 | NOT TESTED | | |
| P3-17 | NOT TESTED | | |
| P3-18 | NOT TESTED | | |
| P3-19 | NOT TESTED | | |
| P3-20 | NOT TESTED | | |
| P3-21 | NOT TESTED | | |
| P3-22 | NOT TESTED | | |

### Phase 4 — Departments

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P4-01 | NOT TESTED | | |
| P4-02 | NOT TESTED | | |
| P4-03 | NOT TESTED | | |
| P4-04 | NOT TESTED | | |
| P4-05 | NOT TESTED | | |
| P4-06 | NOT TESTED | | |
| P4-07 | NOT TESTED | | |
| P4-08 | NOT TESTED | | |
| P4-09 | NOT TESTED | | |

### Phase 5 — Employees

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P5-01 | NOT TESTED | | |
| P5-02 | NOT TESTED | | |
| P5-03 | NOT TESTED | | |
| P5-04 | NOT TESTED | | |
| P5-05 | NOT TESTED | | |
| P5-06 | NOT TESTED | | |
| P5-07 | NOT TESTED | | |
| P5-08 | NOT TESTED | | |
| P5-09 | NOT TESTED | | |
| P5-10 | NOT TESTED | | |
| P5-11 | NOT TESTED | | |
| P5-12 | NOT TESTED | | |

### Phase 6 — Doctors and schedules

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P6-01 | NOT TESTED | | |
| P6-02 | NOT TESTED | | |
| P6-03 | NOT TESTED | | |
| P6-04 | NOT TESTED | | |
| P6-05 | NOT TESTED | | |
| P6-06 | NOT TESTED | | |
| P6-07 | NOT TESTED | | |
| P6-08 | NOT TESTED | | |
| P6-09 | NOT TESTED | | |
| P6-10 | NOT TESTED | | |
| P6-11 | NOT TESTED | | |
| P6-12 | NOT TESTED | | |
| P6-13 | N/A | | Recurrence deferred |
| P6-14 | NOT TESTED | | |

### Phase 7 — Patients

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P7-01 | NOT TESTED | | |
| P7-02 | NOT TESTED | | |
| P7-03 | NOT TESTED | | |
| P7-04 | NOT TESTED | | |
| P7-05 | NOT TESTED | | |
| P7-06 | NOT TESTED | | |
| P7-07 | NOT TESTED | | |
| P7-08 | NOT TESTED | | |
| P7-09 | NOT TESTED | | |
| P7-10 | NOT TESTED | | |
| P7-11 | NOT TESTED | | |
| P7-12 | NOT TESTED | | |
| P7-13 | NOT TESTED | | |
| P7-14 | NOT TESTED | | |
| P7-15 | NOT TESTED | | |
| P7-16 | NOT TESTED | | |

### Phase 8 — Patient documents

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P8-01 | NOT TESTED | | |
| P8-02 | NOT TESTED | | |
| P8-03 | NOT TESTED | | |
| P8-04 | NOT TESTED | | |
| P8-05 | NOT TESTED | | |
| P8-06 | NOT TESTED | | |
| P8-07 | NOT TESTED | | |
| P8-08 | NOT TESTED | | |
| P8-09 | NOT TESTED | | |
| P8-10 | NOT TESTED | | |
| P8-11 | NOT TESTED | | |
| P8-12 | NOT TESTED | | |
| P8-13 | NOT TESTED | | Likely BLOCKED on memory driver |
| P8-14 | NOT TESTED | | |
| P8-15 | NOT TESTED | | |
| P8-16 | NOT TESTED | | Duplicates allowed |
| P8-17 | NOT TESTED | | |
| P8-18 | NOT TESTED | | |
| P8-19 | NOT TESTED | | |
| P8-20 | NOT TESTED | | |
| P8-21 | N/A | | Malware scan deferred |

### Phase 9 — Appointments

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P9-01 | NOT TESTED | | |
| P9-02 | NOT TESTED | | |
| P9-03 | NOT TESTED | | |
| P9-04 | NOT TESTED | | |
| P9-05 | NOT TESTED | | |
| P9-06 | NOT TESTED | | |
| P9-07 | NOT TESTED | | |
| P9-08 | NOT TESTED | | |
| P9-09 | NOT TESTED | | |
| P9-10 | NOT TESTED | | |
| P9-11 | NOT TESTED | | |
| P9-12 | NOT TESTED | | |
| P9-13 | NOT TESTED | | |
| P9-14 | NOT TESTED | | |
| P9-15 | NOT TESTED | | |
| P9-16 | NOT TESTED | | |
| P9-17 | NOT TESTED | | |
| P9-18 | NOT TESTED | | |
| P9-19 | NOT TESTED | | |
| P9-20 | NOT TESTED | | |
| P9-21 | NOT TESTED | | |

### Phase 10 — Calendar

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P10-01 | NOT TESTED | | |
| P10-02 | NOT TESTED | | |
| P10-03 | NOT TESTED | | |
| P10-04 | NOT TESTED | | |
| P10-05 | NOT TESTED | | |
| P10-06 | NOT TESTED | | |
| P10-07 | NOT TESTED | | |
| P10-08 | NOT TESTED | | |
| P10-09 | NOT TESTED | | |
| P10-10 | NOT TESTED | | |
| P10-11 | NOT TESTED | | |
| P10-12 | NOT TESTED | | |
| P10-13 | NOT TESTED | | |
| P10-14 | NOT TESTED | | |
| P10-15 | NOT TESTED | | |

### Phase 11 — Doctor leave and appointments

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P11-01 | NOT TESTED | | |
| P11-02 | NOT TESTED | | |
| P11-03 | NOT TESTED | | |
| P11-04 | NOT TESTED | | |
| P11-05 | NOT TESTED | | |
| P11-06 | NOT TESTED | | |
| P11-07 | NOT TESTED | | |
| P11-08 | NOT TESTED | | |
| P11-09 | NOT TESTED | | |

### Phase 12 — Medical records

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P12-01 | NOT TESTED | | |
| P12-02 | NOT TESTED | | |
| P12-03 | NOT TESTED | | |
| P12-04 | NOT TESTED | | |
| P12-05 | NOT TESTED | | |
| P12-06 | NOT TESTED | | |
| P12-07 | NOT TESTED | | |
| P12-08 | NOT TESTED | | |
| P12-09 | NOT TESTED | | |
| P12-10 | NOT TESTED | | |
| P12-11 | NOT TESTED | | |
| P12-12 | NOT TESTED | | |
| P12-13 | NOT TESTED | | |
| P12-14 | NOT TESTED | | |
| P12-15 | NOT TESTED | | |

### Phase 13 — Prescriptions

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P13-01 | NOT TESTED | | Blocked if catalog empty |
| P13-02 | NOT TESTED | | |
| P13-03 | NOT TESTED | | |
| P13-04 | NOT TESTED | | |
| P13-05 | NOT TESTED | | |
| P13-06 | NOT TESTED | | |
| P13-07 | NOT TESTED | | Admin has `medicine.read` (D-036); expect 200 |
| P13-08 | NOT TESTED | | |
| P13-09 | NOT TESTED | | |
| P13-10 | NOT TESTED | | |
| P13-11 | NOT TESTED | | |
| P13-12 | NOT TESTED | | |

### Phase 14 — Laboratory

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P14-01 | NOT TESTED | | Blocked if catalog empty |
| P14-02 | NOT TESTED | | |
| P14-03 | NOT TESTED | | |
| P14-04 | NOT TESTED | | |
| P14-05 | NOT TESTED | | |
| P14-06 | NOT TESTED | | |
| P14-07 | NOT TESTED | | |
| P14-08 | NOT TESTED | | |
| P14-09 | NOT TESTED | | |
| P14-10 | NOT TESTED | | |
| P14-11 | NOT TESTED | | |
| P14-12 | NOT TESTED | | |
| P14-13 | NOT TESTED | | |
| P14-14 | NOT TESTED | | |
| P14-15 | NOT TESTED | | |
| P14-16 | N/A | | Cancel deferred |
| P14-17 | NOT TESTED | | |
| P14-18 | NOT TESTED | | |

### Phase 15 — Pharmacy

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P15-01 | NOT TESTED | | |
| P15-02 | NOT TESTED | | |
| P15-03 | NOT TESTED | | |
| P15-04 | NOT TESTED | | |
| P15-05 | NOT TESTED | | |
| P15-06 | NOT TESTED | | |
| P15-07 | NOT TESTED | | |
| P15-08 | NOT TESTED | | |
| P15-09 | NOT TESTED | | |
| P15-10 | NOT TESTED | | |
| P15-11 | NOT TESTED | | |
| P15-12 | NOT TESTED | | |
| P15-13 | NOT TESTED | | |
| P15-14 | NOT TESTED | | |
| P15-15 | NOT TESTED | | |
| P15-16 | NOT TESTED | | |
| P15-17 | NOT TESTED | | |
| P15-18 | NOT TESTED | | |
| P15-19 | NOT TESTED | | |
| P15-20 | NOT TESTED | | |
| P15-21 | NOT TESTED | | |

### Phase 16 — Billing

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P16-01 | NOT TESTED | | |
| P16-02 | NOT TESTED | | |
| P16-03 | NOT TESTED | | |
| P16-04 | NOT TESTED | | |
| P16-05 | NOT TESTED | | |
| P16-06 | N/A | | Admission charges deferred |
| P16-07 | NOT TESTED | | |
| P16-08 | NOT TESTED | | |
| P16-09 | NOT TESTED | | |
| P16-10 | NOT TESTED | | |
| P16-11 | NOT TESTED | | |
| P16-12 | NOT TESTED | | |
| P16-13 | NOT TESTED | | |
| P16-14 | NOT TESTED | | |
| P16-15 | NOT TESTED | | |
| P16-16 | NOT TESTED | | |
| P16-17 | NOT TESTED | | |
| P16-18 | NOT TESTED | | |
| P16-19 | NOT TESTED | | |
| P16-20 | NOT TESTED | | |
| P16-21 | NOT TESTED | | |
| P16-22 | NOT TESTED | | |
| P16-23 | NOT TESTED | | |
| P16-24 | NOT TESTED | | |
| P16-25 | N/A | | Tax/discount deferred; stored as zero |

### Phase 17 — Admissions

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P17-01 | NOT TESTED | | |
| P17-02 | NOT TESTED | | |
| P17-03 | NOT TESTED | | |
| P17-04 | NOT TESTED | | |
| P17-05 | NOT TESTED | | |
| P17-06 | NOT TESTED | | |
| P17-07 | NOT TESTED | | |
| P17-08 | NOT TESTED | | |
| P17-09 | NOT TESTED | | Expect 403 ungranted |
| P17-10 | NOT TESTED | | Expect 403 ungranted |
| P17-11 | NOT TESTED | | Expect 403 ungranted |
| P17-12 | NOT TESTED | | Expect 403 |
| P17-13 | NOT TESTED | | |
| P17-14 | NOT TESTED | | |
| P17-15 | NOT TESTED | | |
| P17-16 | N/A | | Discharge UI/permissions deferred D-026 |
| P17-17 | NOT TESTED | | |

### Phase 18 — Attendance

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P18-01 | NOT TESTED | | |
| P18-02 | NOT TESTED | | |
| P18-03 | NOT TESTED | | |
| P18-04 | NOT TESTED | | |
| P18-05 | NOT TESTED | | |
| P18-06 | NOT TESTED | | |
| P18-07 | NOT TESTED | | |
| P18-08 | NOT TESTED | | |
| P18-09 | NOT TESTED | | M16-06 API vs UI |
| P18-10 | NOT TESTED | | |
| P18-11 | NOT TESTED | | |
| P18-12 | NOT TESTED | | |
| P18-13 | NOT TESTED | | |
| P18-14 | NOT TESTED | | |

### Phase 19 — Leave

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P19-01 | NOT TESTED | | |
| P19-02 | NOT TESTED | | |
| P19-03 | NOT TESTED | | |
| P19-04 | NOT TESTED | | |
| P19-05 | NOT TESTED | | |
| P19-06 | NOT TESTED | | |
| P19-07 | NOT TESTED | | |
| P19-08 | NOT TESTED | | M16-05 UI may show Cancel; API 403 |
| P19-09 | NOT TESTED | | |
| P19-10 | NOT TESTED | | |
| P19-11 | NOT TESTED | | |
| P19-12 | NOT TESTED | | |
| P19-13 | NOT TESTED | | |
| P19-14 | NOT TESTED | | |
| P19-15 | NOT TESTED | | |
| P19-16 | NOT TESTED | | |
| P19-17 | NOT TESTED | | |
| P19-18 | NOT TESTED | | |
| P19-19 | NOT TESTED | | |
| P19-20 | NOT TESTED | | |
| P19-21 | NOT TESTED | | |

### Phase 20 — Reports

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P20-01 | NOT TESTED | | |
| P20-02 | NOT TESTED | | Accountant must get 403 |
| P20-03 | NOT TESTED | | |
| P20-04 | NOT TESTED | | |
| P20-05 | NOT TESTED | | |
| P20-06 | NOT TESTED | | |
| P20-07 | NOT TESTED | | |
| P20-08 | NOT TESTED | | |
| P20-09 | NOT TESTED | | |
| P20-10 | NOT TESTED | | |
| P20-11 | NOT TESTED | | |
| P20-12 | NOT TESTED | | |
| P20-13 | NOT TESTED | | |
| P20-14 | N/A | | Analytics CSV/PDF deferred |

### Phase 21 — Dashboard

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P21-01 | NOT TESTED | | |
| P21-02 | NOT TESTED | | |
| P21-03 | NOT TESTED | | |
| P21-04 | NOT TESTED | | |
| P21-05 | NOT TESTED | | |
| P21-06 | NOT TESTED | | |
| P21-07 | NOT TESTED | | |
| P21-08 | NOT TESTED | | |
| P21-09 | NOT TESTED | | |
| P21-10 | NOT TESTED | | |
| P21-11 | NOT TESTED | | |

### Phase 22 — Audit

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P22-01 | NOT TESTED | | |
| P22-02 | NOT TESTED | | |
| P22-03 | NOT TESTED | | |
| P22-04 | NOT TESTED | | |
| P22-05 | NOT TESTED | | |
| P22-06 | NOT TESTED | | |
| P22-07 | NOT TESTED | | |
| P22-08 | NOT TESTED | | |
| P22-09 | NOT TESTED | | |
| P22-10 | NOT TESTED | | |
| P22-11 | NOT TESTED | | |
| P22-12 | NOT TESTED | | |
| P22-13 | NOT TESTED | | |
| P22-14 | NOT TESTED | | |
| P22-15 | NOT TESTED | | May be BLOCKED if volume too low |
| P22-16 | NOT TESTED | | May be BLOCKED if volume too low |
| P22-17 | NOT TESTED | | |
| P22-18 | NOT TESTED | | |
| P22-19 | NOT TESTED | | M16-04 observation |

### Phase 23 — Cross-module workflow

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P23-01 | NOT TESTED | | |
| P23-02 | NOT TESTED | | |
| P23-03 | NOT TESTED | | |
| P23-04 | NOT TESTED | | |
| P23-05 | NOT TESTED | | |
| P23-06 | NOT TESTED | | |
| P23-07 | NOT TESTED | | |
| P23-08 | NOT TESTED | | |
| P23-09 | NOT TESTED | | |
| P23-10 | NOT TESTED | | |
| P23-11 | NOT TESTED | | |
| P23-12 | N/A | | Discharge ungranted; record 403 as expected |
| P23-13 | NOT TESTED | | |
| P23-14 | NOT TESTED | | |
| P23-15 | NOT TESTED | | |

### Phase 24 — Negative testing

| ID | Verdict | Actual | Notes / modules repeated |
| --- | --- | --- | --- |
| P24-01 | NOT TESTED | | |
| P24-02 | NOT TESTED | | |
| P24-03 | NOT TESTED | | |
| P24-04 | NOT TESTED | | |
| P24-05 | NOT TESTED | | |
| P24-06 | NOT TESTED | | |
| P24-07 | NOT TESTED | | |
| P24-08 | NOT TESTED | | |
| P24-09 | NOT TESTED | | |
| P24-10 | NOT TESTED | | |
| P24-11 | NOT TESTED | | |
| P24-12 | NOT TESTED | | |
| P24-13 | NOT TESTED | | |
| P24-14 | NOT TESTED | | |
| P24-15 | NOT TESTED | | |
| P24-16 | NOT TESTED | | |
| P24-17 | NOT TESTED | | |
| P24-18 | NOT TESTED | | |

### Phase 25 — UI inspection

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P25-01 | NOT TESTED | | |
| P25-02 | NOT TESTED | | |
| P25-03 | NOT TESTED | | |
| P25-04 | NOT TESTED | | |
| P25-05 | NOT TESTED | | |
| P25-06 | NOT TESTED | | |
| P25-07 | NOT TESTED | | |
| P25-08 | NOT TESTED | | |
| P25-09 | NOT TESTED | | |
| P25-10 | NOT TESTED | | |
| P25-11 | NOT TESTED | | |

### Phase 26 — API / OpenAPI

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P26-01 | NOT TESTED | | |
| P26-02 | NOT TESTED | | |
| P26-03 | NOT TESTED | | |
| P26-04 | NOT TESTED | | |
| P26-05 | NOT TESTED | | |
| P26-06 | NOT TESTED | | |
| P26-07 | NOT TESTED | | |
| P26-08 | NOT TESTED | | |

### Phase 27 — Database

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P27-01 | NOT TESTED | | |
| P27-02 | NOT TESTED | | |
| P27-03 | NOT TESTED | | |
| P27-04 | NOT TESTED | | |
| P27-05 | NOT TESTED | | |
| P27-06 | NOT TESTED | | |
| P27-07 | NOT TESTED | | |
| P27-08 | NOT TESTED | | |
| P27-09 | NOT TESTED | | |
| P27-10 | NOT TESTED | | |
| P27-11 | NOT TESTED | | |
| P27-12 | NOT TESTED | | |
| P27-13 | NOT TESTED | | |
| P27-14 | NOT TESTED | | |

### Phase 28 — Security

| ID | Verdict | Actual | Notes |
| --- | --- | --- | --- |
| P28-01 | NOT TESTED | | |
| P28-02 | NOT TESTED | | |
| P28-03 | NOT TESTED | | |
| P28-04 | NOT TESTED | | |
| P28-05 | NOT TESTED | | |
| P28-06 | NOT TESTED | | Local Secure off is expected |
| P28-07 | NOT TESTED | | Local SameSite Lax is expected |
| P28-08 | NOT TESTED | | |
| P28-09 | NOT TESTED | | |
| P28-10 | NOT TESTED | | |
| P28-11 | NOT TESTED | | |
| P28-12 | NOT TESTED | | |
| P28-13 | NOT TESTED | | |
| P28-14 | NOT TESTED | | |
| P28-15 | NOT TESTED | | |
| P28-16 | NOT TESTED | | |
| P28-17 | NOT TESTED | | Permission-wide read is approved |
| P28-18 | NOT TESTED | | |
| P28-19 | NOT TESTED | | |
| P28-20 | NOT TESTED | | |
| P28-21 | NOT TESTED | | |
| P28-22 | NOT TESTED | | |
| P28-23 | NOT TESTED | | |
| P28-24 | NOT TESTED | | |
| P28-25 | NOT TESTED | | |
| P28-26 | NOT TESTED | | |

### Phase 29 — Cleanup inventory

| ID | Listed IDs / numbers | Approved to delete later? |
| --- | --- | --- |
| P29-01 Users | | No — wait for owner |
| P29-02 Patients | | No — wait for owner |
| P29-03 Employees / doctors | | No — wait for owner |
| P29-04 Appointments | | No — wait for owner |
| P29-05 Prescriptions | | No — wait for owner |
| P29-06 Lab requests | | No — wait for owner |
| P29-07 Stock | | No — wait for owner |
| P29-08 Invoices / payments | | No — wait for owner |
| P29-09 Admissions | | No — wait for owner |
| P29-10 Documents | | No — wait for owner |
| P29-11 Attendance / leave | | No — wait for owner |
| P29-12 Audit | Do not delete | No |

---

## Execution notes

Add timestamps, blockers, and environment surprises here.
