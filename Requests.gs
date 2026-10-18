function createRequest(input) {
  return apiCall_(function () {
    const user = requireUser_();
    input = input || {};
    const title = requiredText_(input.title, 'Title', 160);
    const description = String(input.description || '').trim();
    const category = requiredText_(input.category, 'Category', 80);
    const quantity = Number(input.quantity);
    const unitCost = Number(input.estimatedUnitCost);
    const requiredBy = parseDateOnly_(input.requiredBy, 'Required-by date');
    const justification = requiredText_(input.justification, 'Business justification', 2000);
    if (!Number.isFinite(quantity) || quantity <= 0) throw safeError_('Quantity must be greater than zero.');
    if (!Number.isFinite(unitCost) || unitCost < 0) throw safeError_('Estimated unit cost must be zero or greater.');
    const now = new Date();
    const id = newId_('REQ');
    const number = nextDocumentNumber_('REQ');
    const record = {
      RequestID:id, RequestNumber:number, RequesterEmail:user.Email,
      DepartmentID:user.DepartmentID || '', Title:title, Description:description,
      Category:category, Quantity:quantity, EstimatedUnitCost:unitCost,
      Currency:String(input.currency || getSetting_('CURRENCY_DEFAULT','IDR')).trim().toUpperCase(),
      RequiredBy:requiredBy, Justification:justification, Status:'SUBMITTED',
      CreatedAt:now, UpdatedAt:now
    };
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    try { appendObject_(getSheet_('Requests'), record); }
    finally { lock.releaseLock(); }
    audit_('REQUEST_CREATED','Request',id,{requestNumber:number,status:'SUBMITTED'});
    createApprovalTasks_(id, record.DepartmentID);
    notifyProcurement_('New procurement request submitted: ' + number);
    return { requestId:id, requestNumber:number, status:record.Status };
  });
}

function listRequests() {
  return apiCall_(function () {
    const user = requireUser_();
    const rows = readObjects_(getSheet_('Requests'));
    const role = String(user.Role).toUpperCase();
    return rows.filter(function (r) {
      return ['ADMIN','PROCUREMENT','APPROVER','FINANCE'].indexOf(role) >= 0 ||
        String(r.RequesterEmail).toLowerCase() === String(user.Email).toLowerCase();
    }).sort(function(a,b) { return new Date(b.CreatedAt) - new Date(a.CreatedAt); }).map(publicRequest_);
  });
}

function getRequest(requestId) {
  return apiCall_(function () {
    const user = requireUser_();
    const row = readObjects_(getSheet_('Requests')).find(function (r) { return r.RequestID === requestId; });
    if (!row) throw safeError_('Request not found.');
    assertCanViewRequest_(user,row);
    return publicRequest_(row);
  });
}

function publicRequest_(r) {
  return {
    requestId:r.RequestID, requestNumber:r.RequestNumber, requesterEmail:r.RequesterEmail,
    departmentId:r.DepartmentID, title:r.Title, description:r.Description, category:r.Category,
    quantity:Number(r.Quantity), estimatedUnitCost:Number(r.EstimatedUnitCost), currency:r.Currency,
    requiredBy:toIsoDate_(r.RequiredBy), justification:r.Justification, status:r.Status,
    createdAt:toIsoDateTime_(r.CreatedAt), updatedAt:toIsoDateTime_(r.UpdatedAt)
  };
}

function assertCanViewRequest_(user, request) {
  const role = String(user.Role).toUpperCase();
  if (['ADMIN','PROCUREMENT','APPROVER','FINANCE'].indexOf(role) >= 0) return;
  if (String(user.Email).toLowerCase() !== String(request.RequesterEmail).toLowerCase()) throw safeError_('You do not have permission to view this request.');
}
