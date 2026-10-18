function getDashboardSummary() {
  return apiCall_(function () { requireUser_(); return getDashboardSummary_(); });
}

function getDashboardSummary_() {
  const user = requireUser_();
  const role = String(user.Role).toUpperCase();
  const all = readObjects_(getSheet_('Requests'));
  const visible = ['ADMIN','PROCUREMENT','APPROVER','FINANCE'].indexOf(role) >= 0 ? all :
    all.filter(function (r) { return String(r.RequesterEmail).toLowerCase() === String(user.Email).toLowerCase(); });
  const counts = {};
  visible.forEach(function (r) { counts[r.Status] = (counts[r.Status] || 0) + 1; });
  const recent = visible.sort(function(a,b){return new Date(b.CreatedAt)-new Date(a.CreatedAt);}).slice(0,8).map(publicRequest_);
  return { totalRequests:visible.length, pendingApproval:counts.PENDING_APPROVAL || counts.SUBMITTED || 0,
    approved:counts.APPROVED || 0, rejected:counts.REJECTED || 0, statusCounts:counts, recentRequests:recent };
}
