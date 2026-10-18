const AYSO = Object.freeze({
  APP_NAME: 'AYSO Procurement',
  TIME_ZONE: Session.getScriptTimeZone() || 'Asia/Jakarta',
  SCHEMA_VERSION: '1.0.0'
});

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(AYSO.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function apiCall_(fn) {
  try {
    return { ok: true, data: fn() };
  } catch (err) {
    console.error('AYSO error: ' + (err && err.stack ? err.stack : err));
    return {
      ok: false,
      error: err && err.safeMessage ? err.safeMessage : 'The operation could not be completed. Check your access and input, then try again.'
    };
  }
}

function getAppBootstrap() {
  return apiCall_(function () {
    const user = requireUser_();
    return {
      appName: AYSO.APP_NAME,
      user: { email: user.Email, name: user.Name, role: user.Role, departmentId: user.DepartmentID },
      dashboard: getDashboardSummary_()
    };
  });
}

function getInitialData() {
  return getAppBootstrap();
}
