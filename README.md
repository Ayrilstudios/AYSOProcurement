# AYSO Procurement — Foundation

## Included files
- `Code.gs`: web entry point, HTML includes, API envelope, bootstrap
- `Auth.gs`: Google-session identity checks, role checks, admin user provisioning
- `Setup.gs`: schema declarations and idempotent sheet initialization
- `Requests.gs`: request creation, list/detail access control
- `Approvals.gs`: approval task creation and decisions
- `Suppliers.gs`: supplier creation and directory
- `PurchaseOrders.gs`: purchase order creation and listing
- `Dashboard.gs`: dashboard summary
- `Notifications.gs`: best-effort email notifications
- `Audit.gs`: audit events
- `Utils.gs`: header mapping, IDs, dates, locks, shared validation
- `Index.html`, `Styles.html`, `Scripts.html`: responsive HTML Service UI

## Spreadsheet schemas
Setup initializes the following exact header rows:

- Users: `UserID, Email, Name, Role, DepartmentID, Status, CreatedAt, UpdatedAt`
- Departments: `DepartmentID, DepartmentName, ManagerEmail, Status, CreatedAt, UpdatedAt`
- Requests: `RequestID, RequestNumber, RequesterEmail, DepartmentID, Title, Description, Category, Quantity, EstimatedUnitCost, Currency, RequiredBy, Justification, Status, CreatedAt, UpdatedAt`
- Approvals: `ApprovalID, RequestID, ApproverEmail, ApprovalLevel, Decision, Comments, DecidedAt, CreatedAt, UpdatedAt`
- Suppliers: `SupplierID, SupplierCode, SupplierName, ContactName, Email, Phone, Address, TaxID, PaymentTerms, Status, CreatedAt, UpdatedAt`
- PurchaseOrders: `PurchaseOrderID, PONumber, RequestID, SupplierID, CreatedBy, OrderDate, ExpectedDeliveryDate, Currency, Subtotal, TaxAmount, TotalAmount, Status, Notes, CreatedAt, UpdatedAt`
- AuditLog: `AuditID, Timestamp, ActorEmail, Action, EntityType, EntityID, DetailsJSON`
- Settings: `SettingKey, SettingValue, Description, UpdatedAt`

## Setup
1. Create a new Google Spreadsheet dedicated to AYSO Procurement.
2. Open **Extensions → Apps Script** from that spreadsheet.
3. Add each `.gs` file as a script file and each `.html` file as an HTML file. Copy its matching file contents from this package. `Utils.gs` is also required.
4. Save the project. In **Project Settings**, select the intended time zone (for example, Asia/Jakarta).
5. From the editor, run `setupAysoProcurement` once and authorize the requested spreadsheet access. It creates missing sheets, verifies existing schemas, and adds default settings. It intentionally stops on mismatched headers rather than silently changing business data.
6. In the `Departments` sheet, add department records with stable IDs such as `DEP_<UUID>`, a department name, manager email, and `ACTIVE` status.
7. Provision the first administrator manually in the `Users` sheet. Example values:
   - `UserID`: `USR_BOOTSTRAP_ADMIN_001`
   - `Email`: the exact Google Workspace email of the administrator
   - `Name`: administrator's display name
   - `Role`: `ADMIN`
   - `DepartmentID`: blank or a valid department ID
   - `Status`: `ACTIVE`
   - `CreatedAt` / `UpdatedAt`: current date-time values
   Do this only in the protected spreadsheet, then restrict who can edit the spreadsheet and script project. Do not put passwords in the sheet.
8. Deploy **Deploy → New deployment → Web app**. For a controlled enterprise deployment, prefer **Execute as: user accessing the web app** and restrict access to the intended Google Workspace audience. Confirm your Workspace configuration exposes `Session.getActiveUser().getEmail()` for this deployment. If it is blank, the app fails closed; it does not fall back to client-provided identity.
9. Open the deployment URL with an active provisioned account and test a request, approval, and audit event.

## Role names
`ADMIN`, `PROCUREMENT`, `APPROVER`, `REQUESTER`, `FINANCE`, `VIEWER`.

## Important limitations before production
This is a foundation, not a fully compliant purchasing platform. Before production use:
- Define approval policy by spend thresholds, department, category, delegation, and separation of duties.
- Add stronger transaction boundaries and idempotency keys for operations that span multiple sheets. Google Sheets does not provide relational transactions.
- Decide whether to use Workspace identity, Google Identity Services, or another approved identity provider for your deployment. Do not treat a hidden UI element as authorization.
- Protect spreadsheet and script-editor access; spreadsheet editors can bypass app-level workflow controls.
- Review audit-log access/retention and consider external immutable logging for regulated use.
- Add PO lifecycle actions (submit, issue, cancel, close), line items, receiving, invoice matching, tax handling, and supplier due diligence as required.
- Add pagination, quotas/rate limits, stronger input validation, tests, monitoring, and deployment version controls.
- Approval task generation currently assigns all active matching approvers at level 1. If there are no matching approvers, a request can remain `SUBMITTED`; configure a mandatory routing policy and fail submission when no approver is assigned.
- The starter interface hides some navigation based on role for usability, but all security decisions remain server-side.
- Email notifications are best-effort and may require additional authorization/quota planning.

## Date conventions
Date-only inputs use `YYYY-MM-DD`, are validated server-side, and are stored as date values at midday to reduce timezone boundary drift. API date values are returned as `YYYY-MM-DD`; timestamps use the Apps Script project timezone.

## Security notes
- No passwords are stored in Sheets.
- Identity is resolved server-side.
- Server methods enforce role and record-access checks.
- Do not deploy with anonymous access.
- Do not use “execute as me” for a broad audience unless you have deliberately designed and reviewed the authorization model.
