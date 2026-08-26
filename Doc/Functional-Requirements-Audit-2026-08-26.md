# Functional Requirements Audit — 2026-08-26

## Source of Truth
- `Doc/Part3/Part3.txt` — current Chapter 3
- `Doc/Part2/Part2.txt` — supporting domain/process requirements
- Current implementation under `api/`, `assets/`, `database/`

> This is an audit only. Chapter 3 is not modified by this document.

## 3.3 Software requirements

| Requirement | Current status | Notes |
|---|---|---|
| HTML5/CSS/JavaScript/PHP/MySQL | PASS | Present in current implementation. |
| Table/report/graph presentation | PARTIAL | Tables and summary cards/reports exist; dedicated statistical charts are not clearly implemented as a full chart module. |
| LINE notification | PARTIAL | Workflow/API exists, but the current UI does not supply a production LINE credential/token; real sending is not yet operational from the UI. |
| Authentication/authorization | PASS | Login/session and role checks exist for member, committee, president. |

## 3.4 Design items

| Item | Current status | Notes |
|---|---|---|
| Context / DFD / data dictionary | DOCUMENTED | These are project-analysis deliverables, not runtime functions. |
| Data model | PASS / EXPANDED | Current database is richer than the four example tables named in Chapter 3; this is intentional for the implemented workflow. |
| Database design | PASS | Members, requests, payments, reports plus contracts, installments, catalog, fiscal year, audit, procurement/receiving/delivery structures. |
| Output screens | PASS | Member, request, payment, reports, dashboard and workflow screens exist. |
| Input forms | PASS | Member, request/catalog, payment, search and administrative forms exist. |
| Responsive UI | IMPLEMENTED | Bootstrap-oriented responsive layout is present; device-by-device acceptance testing remains. |

## 3.6.3 Functional questionnaire coverage

### Input/data entry
1. Member CRUD + historical search — PASS.
2. Fertilizer/medicine/seed request — PASS.
3. Fund income/expense records — PASS.
4. Payment evidence/slip — PASS.
5. Historical member/transaction search — PASS / verify end-to-end acceptance testing.

### Processing
1. Processing speed/correctness — IMPLEMENTED, requires performance acceptance test.
2. Principal/interest/payment calculation — PASS / requires numerical test cases before final sign-off.
3. Real-time request status — PASS within web session/API workflow; real-time means current server state rather than push sockets.
4. Member/request/payment linkage — PASS.
5. Request status inspection — PASS.

### Reporting
1. Request summary report — PASS.
2. Annual income/expense/balance — PASS for ledger totals and balance; final report format should be acceptance-tested against the required report form.
3. Payment status/history — PASS.
4. Statistical charts — PARTIAL. Summary/stat cards exist, but a dedicated chart implementation is not clearly complete.
5. Readable/printable reports — PASS / final visual acceptance test remains.

### Security
1. Login/authentication — PASS.
2. Role-based access (member/committee/president) — PASS.
3. Password storage/security — PASS at implementation level (`password_hash`). Production hardening remains required before Internet deployment.
4. Unauthorized access prevention — PASS at API role-check level; must be penetration/negative-path tested before production.
5. User login history — PASS via `audit_logs` for login/logout and important actions.

## Domain requirements from Chapter 2 that materially affect implementation

- Interest is described as 6% per year.
- Request/project form requires date, borrower identity, phone, requested amount, purpose, guarantors (up to 3), and committee decision.
- The documented legal package includes **แบบ กทบ.01–02 (project proposal/supporting documents)**, **แบบ กทบ.03 (spouse certification/consent)**, **loan contract**, and **แบบ กทบ.05 (guarantor contract)**. Chapter 2 states that the guarantor contract binds the guarantor to repay when the borrower defaults or becomes bankrupt/deceased.
- The Chapter 2 checklist explicitly mentions copies of the borrower's and spouse's ID cards/house registration, spouse consent, and land-right documents (โฉนด/น.ส.3 ก./น.ส.3). These must be represented as document/checklist items rather than only free-text notes.
- The project proposal records up to three guarantors with name and national ID; the current database/API also stores phone and address for each guarantor.
- Loan contract supports lump-sum or installment repayment and late-payment terms.
- Special cases include payment deferment and deceased-member account handling.
- Annual fiscal summary and year closing are part of the lifecycle.

### Legal/document checklist audit (KTB 01–05)

| Document/process from Chapter 2 | Current implementation | Assessment |
|---|---|---|
| กทบ.01–02 project proposal + supporting information | Request stores core proposal fields and a checklist JSON; request detail can load document records | PARTIAL — field coverage exists, but the checklist needs to be mapped explicitly to each required document/form item |
| Guarantors up to 3 persons | `request_guarantors` stores up to 3 guarantors with name, national ID, phone and address | PASS for data structure; legal-form presentation/signature workflow still needs verification |
| กทบ.03 spouse certification/consent | Member/request has marital and spouse fields; supporting-document records exist | PARTIAL — spouse information exists, but the actual consent form/checklist and signature evidence need an explicit workflow |
| Loan contract | President approval leads to contract-pending and member confirmation; payment plan data exists | PARTIAL — workflow exists, but the generated/printable contract should be checked against the real project form |
| กทบ.05 guarantor contract | Guarantor data exists and is linked to request | PARTIAL — guarantor contract generation/signature/evidence is not yet proven end-to-end against the actual form |
| ID/house-registration/land-right attachments | Request documents table/checklist mechanism exists | PARTIAL — required document types need explicit checklist definitions and verification status rules |

> The Chapter 2 text identifies the legal/document requirements and figure references, but the current text extraction does not contain the visual form fields from the embedded images. Therefore this audit does not invent field-level details that cannot be verified from the extracted document. The actual PDF/form images should be visually reviewed before finalizing the form schema.

## Gaps / items to finish before final project acceptance

1. Complete dedicated statistical charts for the reporting requirement.
2. Make the production LINE notification integration operational and verify the currently supported LINE delivery mechanism/credentials before deployment.
3. Verify the full document checklist workflow against the actual Chapter 2 forms (KTB 01–05), including guarantor and spouse-consent details.
4. Perform end-to-end numeric tests for 6% interest, installment schedules, lump-sum payments, partial payments and overdue cases.
5. Verify special-case workflows for deferment and deceased members end-to-end, including account/interest closure rules.
6. Verify final annual report format and fiscal-year closing with carried-forward outstanding debt.
7. Run acceptance tests on mobile/tablet/desktop and all role boundaries.
8. Before Internet deployment, harden configuration, secrets, HTTPS, session cookies, database permissions, upload validation and backup/restore procedures.

## Current project workflow additions not explicitly listed as detailed functions in Chapter 3

These were added from the later project requirements and should remain implemented unless the project documentation is revised:

- Member Service Station for committee-assisted transactions.
- Annual catalog and request-intake switch.
- Annual market-price survey prerequisite.
- Procurement batches/lots.
- Supplier-side receiving inspection before member delivery.
- Member delivery preparation and handover records.
- Delivery receipt numbering.

These are treated as workflow extensions, not as reasons to rewrite Chapter 3 at this time.

## Overall result

The current implementation covers the majority of the Chapter 3 functional questionnaire. The highest-priority gaps are **statistical charts, production LINE integration, document/legal checklist completeness, and end-to-end financial/special-case acceptance tests**. The newer procurement/receiving/delivery workflow is implemented as an extension and should be reflected in Chapter 3 later when the document is revised.
