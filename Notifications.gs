function notifyProcurement_(message) {
  const recipients = readObjects_(getSheet_('Users')).filter(function (u) {
    return u.Status === 'ACTIVE' && ['ADMIN','PROCUREMENT'].indexOf(String(u.Role).toUpperCase()) >= 0 && u.Email;
  }).map(function (u) { return u.Email; });
  sendNotification_(recipients,message);
}

function notifyRequester_(email,message) {
  sendNotification_([email],message);
}

function sendNotification_(recipients,message) {
  const unique = Array.from(new Set((recipients || []).map(function (e) { return String(e||'').trim(); }).filter(Boolean)));
  if (!unique.length) return;
  // Email delivery is intentionally best-effort; business operations should not fail solely on email.
  try {
    MailApp.sendEmail({to:unique.join(','),subject:'AYSO Procurement notification',body:String(message || '').slice(0,4000)});
  } catch (err) {
    console.error('Notification delivery failed: ' + err);
  }
}
