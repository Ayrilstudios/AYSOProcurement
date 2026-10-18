function createPurchaseOrder(input) {
  return apiCall_(function () {
    requireRole_(['ADMIN','PROCUREMENT']);
    input = input || {};
    const requestId = String(input.requestId || '');
    const supplierId = String(input.supplierId || '');
    const req = readObjects_(getSheet_('Requests')).find(function (r) { return r.RequestID === requestId; });
    if (!req) throw safeError_('Request not found.');
    if (req.Status !== 'APPROVED') throw safeError_('Only approved requests can be converted to a purchase order.');
    const supplier = readObjects_(getSheet_('Suppliers')).find(function (s) { return s.SupplierID === supplierId && s.Status === 'ACTIVE'; });
    if (!supplier) throw safeError_('An active supplier is required.');
    const subtotal = Number(input.subtotal);
    const tax = Number(input.taxAmount || 0);
    if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(tax) || tax < 0) throw safeError_('Subtotal and tax must be valid non-negative amounts.');
    const orderDate = parseDateOnly_(input.orderDate || new Date(), 'Order date');
    const expected = input.expectedDeliveryDate ? parseDateOnly_(input.expectedDeliveryDate,'Expected delivery date') : '';
    const now = new Date(), id = newId_('PO'), poNumber = nextDocumentNumber_('PO');
    appendObject_(getSheet_('PurchaseOrders'),{PurchaseOrderID:id,PONumber:poNumber,RequestID:requestId,
      SupplierID:supplierId,CreatedBy:currentEmail_(),OrderDate:orderDate,ExpectedDeliveryDate:expected,
      Currency:String(input.currency || req.Currency || 'IDR').toUpperCase(),Subtotal:subtotal,TaxAmount:tax,
      TotalAmount:subtotal+tax,Status:'DRAFT',Notes:String(input.notes||'').trim().slice(0,2000),CreatedAt:now,UpdatedAt:now});
    audit_('PURCHASE_ORDER_CREATED','PurchaseOrder',id,{poNumber:poNumber,requestId:requestId,supplierId:supplierId});
    return {purchaseOrderId:id,poNumber:poNumber,status:'DRAFT'};
  });
}

function listPurchaseOrders() {
  return apiCall_(function () {
    requireRole_(['ADMIN','PROCUREMENT','FINANCE','APPROVER']);
    return readObjects_(getSheet_('PurchaseOrders')).map(function (p) {
      return {purchaseOrderId:p.PurchaseOrderID,poNumber:p.PONumber,requestId:p.RequestID,supplierId:p.SupplierID,
        orderDate:toIsoDate_(p.OrderDate),expectedDeliveryDate:toIsoDate_(p.ExpectedDeliveryDate),
        currency:p.Currency,subtotal:Number(p.Subtotal),taxAmount:Number(p.TaxAmount),totalAmount:Number(p.TotalAmount),
        status:p.Status,notes:p.Notes};
    });
  });
}
