function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss && ss.getSheetByName(name);
  if (!sh) throw safeError_('Required sheet "' + name + '" is missing. Ask an administrator to run setup.');
  return sh;
}

function headers_(sheet) {
  const n = sheet.getLastColumn();
  if (!n) throw safeError_('Sheet "' + sheet.getName() + '" has no header row.');
  const headers = sheet.getRange(1,1,1,n).getDisplayValues()[0];
  if (headers.some(function (h) { return !h; })) throw safeError_('Sheet "' + sheet.getName() + '" contains a blank header.');
  if (new Set(headers).size !== headers.length) throw safeError_('Sheet "' + sheet.getName() + '" contains duplicate headers.');
  return headers;
}

function readObjects_(sheet) {
  const headers = headers_(sheet), lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2,1,lastRow-1,headers.length).getValues().map(function (row) {
    const obj = {};
    headers.forEach(function (h,i) { obj[h] = row[i]; });
    return obj;
  });
}

function appendObject_(sheet, obj) {
  const headers = headers_(sheet);
  const row = headers.map(function (h) { return Object.prototype.hasOwnProperty.call(obj,h) ? obj[h] : ''; });
  sheet.appendRow(row);
}

function updateObjectById_(sheet, idHeader, id, patch) {
  const headers = headers_(sheet), idx = headers.indexOf(idHeader);
  if (idx < 0) throw safeError_('Identifier column is missing.');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw safeError_('Record not found.');
  const values = sheet.getRange(2,idx+1,lastRow-1,1).getValues();
  for (let i=0;i<values.length;i++) {
    if (String(values[i][0]) === String(id)) {
      const rowNum = i+2;
      Object.keys(patch).forEach(function (key) {
        const col = headers.indexOf(key);
        if (col >= 0) sheet.getRange(rowNum,col+1).setValue(patch[key]);
      });
      return true;
    }
  }
  throw safeError_('Record not found.');
}

function newId_(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g,'').toUpperCase();
}

function nextDocumentNumber_(prefix) {
  const year = Utilities.formatDate(new Date(), AYSO.TIME_ZONE, 'yyyy');
  const key = 'SEQ_' + prefix + '_' + year;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const next = Number(props.getProperty(key) || 0) + 1;
    props.setProperty(key,String(next));
    return prefix + '-' + year + '-' + String(next).padStart(5,'0');
  } finally { lock.releaseLock(); }
}

function requiredText_(value,label,max) {
  const s = String(value == null ? '' : value).trim();
  if (!s) throw safeError_(label + ' is required.');
  if (s.length > max) throw safeError_(label + ' must be ' + max + ' characters or fewer.');
  return s;
}

function parseDateOnly_(value,label) {
  if (value instanceof Date && !isNaN(value.getTime())) return new Date(value.getFullYear(),value.getMonth(),value.getDate(),12,0,0);
  const s = String(value == null ? '' : value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw safeError_(label + ' must use YYYY-MM-DD format.');
  const parts = s.split('-').map(Number), d = new Date(parts[0],parts[1]-1,parts[2],12,0,0);
  if (d.getFullYear() !== parts[0] || d.getMonth() !== parts[1]-1 || d.getDate() !== parts[2]) throw safeError_(label + ' is not a valid calendar date.');
  return d;
}

function toIsoDate_(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d,AYSO.TIME_ZONE,'yyyy-MM-dd');
}

function toIsoDateTime_(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return Utilities.formatDate(d,AYSO.TIME_ZONE,"yyyy-MM-dd'T'HH:mm:ss");
}
