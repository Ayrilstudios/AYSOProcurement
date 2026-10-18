function audit_(action, entityType, entityId, details) {
  try {
    const actor = currentEmail_() || 'SYSTEM';
    appendObject_(getSheet_('AuditLog'), {
      AuditID:newId_('AUD'), Timestamp:new Date(), ActorEmail:actor,
      Action:String(action || '').slice(0,100), EntityType:String(entityType || '').slice(0,100),
      EntityID:String(entityId || '').slice(0,200), DetailsJSON:JSON.stringify(details || {}).slice(0,10000)
    });
  } catch (err) {
    console.error('Audit write failed: ' + err);
    throw safeError_('The action could not be safely recorded. Please retry or contact an administrator.');
  }
}
