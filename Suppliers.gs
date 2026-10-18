function createSupplier(input) {
  return apiCall_(function () {
    requireRole_(['ADMIN','PROCUREMENT']);
    input = input || {};
    const name = requiredText_(input.supplierName,'Supplier name',180);
    const email = String(input.email || '').trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw safeError_('Supplier email is invalid.');
    const sh = getSheet_('Suppliers');
    const code = String(input.supplierCode || '').trim() || nextDocumentNumber_('SUP');
    if (readObjects_(sh).some(function (s) { return s.SupplierCode === code; })) throw safeError_('Supplier code already exists.');
    const now = new Date(), id = newId_('SUP');
    appendObject_(sh,{SupplierID:id,SupplierCode:code,SupplierName:name,ContactName:String(input.contactName||'').trim(),
      Email:email,Phone:String(input.phone||'').trim(),Address:String(input.address||'').trim(),
      TaxID:String(input.taxId||'').trim(),PaymentTerms:String(input.paymentTerms||'').trim(),
      Status:'ACTIVE',CreatedAt:now,UpdatedAt:now});
    audit_('SUPPLIER_CREATED','Supplier',id,{supplierCode:code});
    return {supplierId:id,supplierCode:code};
  });
}

function listSuppliers() {
  return apiCall_(function () {
    requireRole_(['ADMIN','PROCUREMENT','FINANCE','APPROVER']);
    return readObjects_(getSheet_('Suppliers')).filter(function (s) { return s.Status === 'ACTIVE'; })
      .map(function (s) { return {supplierId:s.SupplierID,supplierCode:s.SupplierCode,supplierName:s.SupplierName,
        contactName:s.ContactName,email:s.Email,phone:s.Phone,paymentTerms:s.PaymentTerms,status:s.Status}; });
  });
}
