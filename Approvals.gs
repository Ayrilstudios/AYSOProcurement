function createApprovalTasks_(requestId, departmentId) {
  // Starter policy: active APPROVER users are assigned a level-1 task.
  // Replace with department/amount-based routing before production rollout.
  const approvers = readObjects_(getSheet_('Users')).filter(function (u) {
    return String(u.Status).toUpperCase() === 'ACTIVE' &&
      String(u.Role).toUpperCase() === 'APPROVER' &&
      (!u.DepartmentID || u.DepartmentID === departmentId);
  });
  const now = new Date();
  approvers.forEach(function (u) {
    appendObject_(getSheet_('Approvals'), {
      ApprovalID:newId_('APR'), RequestID:requestId, ApproverEmail:u.Email,
      ApprovalLevel:1, Decision:'PENDING', Comments:'', DecidedAt:'',
      CreatedAt:now, UpdatedAt:now
    });
  });
}

function listMyApprovals() {
  return apiCall_(function () {
    const user = requireRole_(['ADMIN','APPROVER','PROCUREMENT']);
    const approvals = readObjects_(getSheet_('Approvals')).filter(function (a) {
      return String(user.Role).toUpperCase() === 'ADMIN' ||
        String(a.ApproverEmail).toLowerCase() === String(user.Email).toLowerCase();
    });
    const requests = readObjects_(getSheet_('Requests'));
    return approvals.map(function (a) {
      const r = requests.find(function (x) { return x.RequestID === a.RequestID; });
      return { approvalId:a.ApprovalID, requestId:a.RequestID, approverEmail:a.ApproverEmail,
        approvalLevel:Number(a.ApprovalLevel), decision:a.Decision, comments:a.Comments,
        request:r ? publicRequest_(r) : null };
    });
  });
}

function decideApproval(input) {
  return apiCall_(function () {
    const user = requireRole_(['ADMIN','APPROVER']);
    input = input || {};
    const id = String(input.approvalId || '');
    const decision = String(input.decision || '').toUpperCase();
    const comments = String(input.comments || '').trim().slice(0,2000);
    if (['APPROVED','REJECTED'].indexOf(decision) < 0) throw safeError_('Decision must be APPROVED or REJECTED.');
    const lock = LockService.getScriptLock(); lock.waitLock(30000);
    try {
      const sh = getSheet_('Approvals');
      const approval = readObjects_(sh).find(function (a) { return a.ApprovalID === id; });
      if (!approval) throw safeError_('Approval task not found.');
      if (String(user.Role).toUpperCase() !== 'ADMIN' &&
          String(approval.ApproverEmail).toLowerCase() !== String(user.Email).toLowerCase()) throw safeError_('This approval is assigned to another user.');
      if (approval.Decision !== 'PENDING') throw safeError_('This approval has already been decided.');
      const now = new Date();
      updateObjectById_(sh,'ApprovalID',id,{Decision:decision,Comments:comments,DecidedAt:now,UpdatedAt:now});
      const requestSh = getSheet_('Requests');
      const req = readObjects_(requestSh).find(function (r) { return r.RequestID === approval.RequestID; });
      if (!req) throw safeError_('Linked request not found.');
      const all = readObjects_(sh).filter(function (a) { return a.RequestID === req.RequestID; });
      const rejected = all.some(function (a) { return a.Decision === 'REJECTED'; });
      const pending = all.some(function (a) { return a.Decision === 'PENDING'; });
      const nextStatus = rejected ? 'REJECTED' : (pending ? 'PENDING_APPROVAL' : 'APPROVED');
      updateObjectById_(requestSh,'RequestID',req.RequestID,{Status:nextStatus,UpdatedAt:now});
      audit_('APPROVAL_DECIDED','Approval',id,{requestId:req.RequestID,decision:decision});
      notifyRequester_(req.RequesterEmail,'Request ' + req.RequestNumber + ' status: ' + nextStatus);
      return { approvalId:id, decision:decision, requestStatus:nextStatus };
    } finally { lock.releaseLock(); }
  });
}
