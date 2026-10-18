function currentEmail_() {
  // This only works reliably when the deployment and Workspace policies expose identity.
  const email = Session.getActiveUser().getEmail();
  return String(email || '').trim().toLowerCase();
}

function requireUser_() {
  const email = currentEmail_();
  if (!email) throw safeError_('Google account identity is unavailable. Deploy for an authenticated Workspace audience or configure your identity strategy before using the app.');
  const user = readObjects_(getSheet_('Users')).find(function (r) {
    return String(r.Email || '').trim().toLowerCase() === email &&
      String(r.Status || '').toUpperCase() === 'ACTIVE';
  });
  if (!user) throw safeError_('Your Google account is not an active AYSO Procurement user. Contact an administrator.');
  return user;
}

function requireRole_(allowedRoles) {
  const user = requireUser_();
  if (allowedRoles.indexOf(String(user.Role || '').toUpperCase()) === -1) {
    throw safeError_('You do not have permission to perform this action.');
  }
  return user;
}

function requireAdmin_() {
  return requireRole_(['ADMIN']);
}

function safeError_(message) {
  const e = new Error(message);
  e.safeMessage = message;
  return e;
}

/**
 * Identity is derived on the server from the Google session, never from client input.
 * Roles/status are looked up in the Users sheet on each privileged operation.
 */
function getCurrentUser() {
  return apiCall_(function () {
    const u = requireUser_();
    return { email: u.Email, name: u.Name, role: u.Role, departmentId: u.DepartmentID };
  });
}

/** Admin-only user provisioning. Email is not a password or login secret. */
function adminCreateUser(input) {
  return apiCall_(function () {
    requireAdmin_();
    const email = String(input && input.email || '').trim().toLowerCase();
    const name = String(input && input.name || '').trim();
    const role = String(input && input.role || 'REQUESTER').trim().toUpperCase();
    const departmentId = String(input && input.departmentId || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw safeError_('Enter a valid email address.');
    if (!name) throw safeError_('Name is required.');
    if (['ADMIN','PROCUREMENT','APPROVER','REQUESTER','FINANCE','VIEWER'].indexOf(role) < 0) throw safeError_('Unsupported role.');
    const sh = getSheet_('Users');
    if (readObjects_(sh).some(function (r) { return String(r.Email).toLowerCase() === email; })) throw safeError_('A user with this email already exists.');
    const now = new Date();
    const id = newId_('USR');
    appendObject_(sh, { UserID:id, Email:email, Name:name, Role:role, DepartmentID:departmentId, Status:'ACTIVE', CreatedAt:now, UpdatedAt:now });
    audit_('USER_CREATED','User',id,{email:email,role:role});
    return { userId:id, email:email };
  });
}

function adminSetUserStatus(userId, status) {
  return apiCall_(function () {
    const actor = requireAdmin_();
    status = String(status || '').toUpperCase();
    if (['ACTIVE','INACTIVE'].indexOf(status) < 0) throw safeError_('Status must be ACTIVE or INACTIVE.');
    const sh = getSheet_('Users');
    const target = readObjects_(sh).find(function (r) { return r.UserID === userId; });
    if (!target) throw safeError_('User not found.');
    if (String(target.Email).toLowerCase() === String(actor.Email).toLowerCase() && status === 'INACTIVE') throw safeError_('You cannot deactivate your own account.');
    updateObjectById_(sh, 'UserID', userId, {Status:status, UpdatedAt:new Date()});
    audit_('USER_STATUS_CHANGED','User',userId,{status:status});
    return { userId:userId, status:status };
  });
}
