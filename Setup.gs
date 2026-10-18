const SHEET_SCHEMAS = Object.freeze({
  Users: ['UserID','Email','Name','Role','DepartmentID','Status','CreatedAt','UpdatedAt'],
  Departments: ['DepartmentID','DepartmentName','ManagerEmail','Status','CreatedAt','UpdatedAt'],
  Requests: ['RequestID','RequestNumber','RequesterEmail','DepartmentID','Title','Description','Category','Quantity','EstimatedUnitCost','Currency','RequiredBy','Justification','Status','CreatedAt','UpdatedAt'],
  Approvals: ['ApprovalID','RequestID','ApproverEmail','ApprovalLevel','Decision','Comments','DecidedAt','CreatedAt','UpdatedAt'],
  Suppliers: ['SupplierID','SupplierCode','SupplierName','ContactName','Email','Phone','Address','TaxID','PaymentTerms','Status','CreatedAt','UpdatedAt'],
  PurchaseOrders: ['PurchaseOrderID','PONumber','RequestID','SupplierID','CreatedBy','OrderDate','ExpectedDeliveryDate','Currency','Subtotal','TaxAmount','TotalAmount','Status','Notes','CreatedAt','UpdatedAt'],
  AuditLog: ['AuditID','Timestamp','ActorEmail','Action','EntityType','EntityID','DetailsJSON'],
  Settings: ['SettingKey','SettingValue','Description','UpdatedAt']
});

function setupAysoProcurement() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open this script from the target Google Spreadsheet before running setup.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const report = [];
    Object.keys(SHEET_SCHEMAS).forEach(function (name) {
      let sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        sheet.getRange(1, 1, 1, SHEET_SCHEMAS[name].length).setValues([SHEET_SCHEMAS[name]]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, SHEET_SCHEMAS[name].length).setFontWeight('bold');
        report.push(name + ': created');
      } else {
        const lastCol = sheet.getLastColumn();
        if (lastCol === 0 || sheet.getLastRow() === 0) {
          sheet.getRange(1, 1, 1, SHEET_SCHEMAS[name].length).setValues([SHEET_SCHEMAS[name]]);
          sheet.setFrozenRows(1);
          report.push(name + ': headers initialized');
        } else {
          const existing = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].filter(String);
          const expected = SHEET_SCHEMAS[name];
          const missing = expected.filter(function (h) { return existing.indexOf(h) === -1; });
          const unexpected = existing.filter(function (h) { return expected.indexOf(h) === -1; });
          if (missing.length || unexpected.length) {
            throw new Error('Schema mismatch in ' + name + '. Missing: ' + (missing.join(', ') || 'none') + '. Unexpected: ' + (unexpected.join(', ') || 'none') + '. No changes were made to this sheet; resolve the header mismatch manually.');
          }
          report.push(name + ': verified');
        }
      }
    });
    setSetting_('SCHEMA_VERSION', AYSO.SCHEMA_VERSION, 'AYSO Procurement schema version');
    setSetting_('TIME_ZONE', AYSO.TIME_ZONE, 'Timezone used for application date formatting');
    setSetting_('CURRENCY_DEFAULT', 'IDR', 'Default currency for new requests');
    return { ok: true, report: report };
  } finally {
    lock.releaseLock();
  }
}

function setSetting_(key, value, description) {
  const sh = getSheet_('Settings');
  const rows = readObjects_(sh);
  const found = rows.find(function (r) { return r.SettingKey === key; });
  const now = new Date();
  if (found) {
    updateObjectById_(sh, 'SettingKey', key, {
      SettingValue: value, Description: description, UpdatedAt: now
    });
  } else {
    appendObject_(sh, {
      SettingKey: key, SettingValue: value, Description: description, UpdatedAt: now
    });
  }
}

function getSetting_(key, fallback) {
  const row = readObjects_(getSheet_('Settings')).find(function (r) { return r.SettingKey === key; });
  return row ? row.SettingValue : fallback;
}
