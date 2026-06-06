'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetPOSMenuItemsQuery } from '@/lib/api/endpoints/posApi';
import {
  useCreatePurchaseReturnMutation,
  useDeletePurchaseReturnMutation,
  useGetPurchaseReturnsQuery,
  useUpdatePurchaseReturnMutation,
} from '@/lib/api/endpoints/purchaseReturnsApi';
import { useGetPurchaseOrdersQuery } from '@/lib/api/endpoints/purchaseOrdersApi';
import { useGetSuppliersQuery } from '@/lib/api/endpoints/suppliersApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function PurchaseReturnsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const branchId = user?.branchId || '';
  const companyId = user?.companyId || (companyContext as any)?.companyId || '';

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data, isLoading, refetch } = useGetPurchaseReturnsQuery(
    { companyId, branchId, status: statusFilter || undefined },
    { skip: !companyId }
  );
  const returns = useMemo(() => (data as any)?.returns || [], [data]);

  const { data: menuData } = useGetPOSMenuItemsQuery({ branchId: user?.branchId || undefined, isAvailable: true });
  const products = useMemo(() => Array.isArray(menuData) ? menuData : [], [menuData]);

  const { data: suppliersData } = useGetSuppliersQuery({ companyId }, { skip: !companyId });
  const suppliers = useMemo(() => (suppliersData as any)?.suppliers || [], [suppliersData]);

  const { data: ordersData } = useGetPurchaseOrdersQuery({ companyId, branchId, status: 'received' }, { skip: !companyId });
  const purchaseOrders = useMemo(() => (ordersData as any)?.orders || [], [ordersData]);

  const [createReturn] = useCreatePurchaseReturnMutation();
  const [updateReturn] = useUpdatePurchaseReturnMutation();
  const [deleteReturn] = useDeletePurchaseReturnMutation();

  const [form, setForm] = useState({ supplierId: '', supplierName: '', purchaseOrderId: '', items: [] as any[], notes: '' });
  const [newItem, setNewItem] = useState({ productId: '', quantity: 1, unitCost: 0, reason: 'damaged', notes: '' });

  const addItem = () => {
    if (!newItem.productId || newItem.quantity < 1) return;
    const product = products.find((p: any) => p.id === newItem.productId);
    const finalUnitCost = newItem.unitCost > 0 ? newItem.unitCost : ((product as any)?.cost || product?.price || 0);
    setForm({
      ...form,
      items: [...form.items, { ...newItem, productName: product?.name || '', productId: newItem.productId, unitCost: finalUnitCost }],
    });
    setNewItem({ productId: '', quantity: 1, unitCost: 0, reason: 'damaged', notes: '' });
  };

  const handleCreate = async () => {
    if (!form.purchaseOrderId) { toast.error('Please select a Purchase Order'); return; }
    if (form.items.length === 0) { toast.error('Add at least one item'); return; }
    try {
      await createReturn({ branchId, ...form }).unwrap();
      toast.success('Purchase return created');
      setIsCreateOpen(false);
      setForm({ supplierId: '', supplierName: '', purchaseOrderId: '', items: [], notes: '' });
      refetch();
    } catch (e: any) { toast.error(e?.data?.message || 'Failed'); }
  };

  const handleApprove = async (id: string) => {
    try { await updateReturn({ id, status: 'approved' }).unwrap(); refetch(); } catch {} 
  };
  const handleSettle = async (id: string, type: string) => {
    try { await updateReturn({ id, status: 'settled', settlementType: type }).unwrap(); refetch(); } catch {} 
  };
  const handleReject = async (id: string) => {
    try { await updateReturn({ id, status: 'rejected' }).unwrap(); refetch(); } catch {}
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-blue-100 text-blue-700', settled: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
    return <Badge className={m[s] || ''}>{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Returns</h1>
          <p className="text-gray-500">Return damaged, expired, or defective items to suppliers</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}><PlusIcon className="h-4 w-4 mr-2" />New Return</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Returns ({returns.length})</CardTitle>
          <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'settled', label: 'Settled' }, { value: 'rejected', label: 'Rejected' }]} className="w-48" />
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-gray-400">Loading...</p> : returns.length === 0 ? <p className="text-gray-400">No returns</p> : (
            <div className="space-y-3">
              {returns.map((r: any) => (
                <div key={r.id} className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold">#{r.returnNumber}</span>
                      <span className="text-gray-500 ml-3">{formatDateTime(r.createdAt)}</span>
                      <span className="text-gray-500 ml-3">{r.items?.length || 0} items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusBadge(r.status)}
                      <span className="font-bold">{formatCurrency(r.totalAmount)}</span>
                      {r.status === 'pending' && (
                        <>
                          <Button size="sm" variant="primary" onClick={() => handleApprove(r.id)}>Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleReject(r.id)}>Reject</Button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <>
                          <Button size="sm" onClick={() => handleSettle(r.id, 'replacement')}>Replaced</Button>
                          <Button size="sm" variant="secondary" onClick={() => handleSettle(r.id, 'credit_note')}>Credit Note</Button>
                        </>
                      )}
                      {r.status !== 'settled' && (
                        <Button size="sm" variant="ghost" onClick={async () => { await deleteReturn(r.id); refetch(); }}><TrashIcon className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {r.items?.map((item: any, i: number) => (
                      <span key={i} className="inline-block mr-3">{item.productName || item.productId} ×{item.quantity} ({item.reason})</span>
                    ))}
                  </div>
                  {r.supplierName && <div className="text-xs text-gray-400 mt-1">Supplier: {r.supplierName}</div>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Purchase Return" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-red-500">Purchase Order *</label>
              <Select 
                value={form.purchaseOrderId} 
                onChange={(v) => { 
                  const po: any = purchaseOrders.find((x: any) => x.id === v); 
                  setForm({ ...form, purchaseOrderId: v, supplierId: po?.supplierId || '', supplierName: po?.supplier?.name || '', items: [] }); 
                }} 
                options={[{ value: '', label: 'Select PO' }, ...purchaseOrders.map((po: any) => ({ value: po.id, label: `${po.orderNumber} - ${po.supplier?.name}` }))]} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Supplier</label>
              <Input value={form.supplierName} disabled placeholder="Auto-filled from PO" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold mb-1">Notes</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-bold text-sm mb-2">Items to Return</h4>
            <div className="grid grid-cols-6 gap-2 mb-2">
              <Select value={newItem.productId} onChange={(v) => {
                const selectedPo = purchaseOrders.find((po: any) => po.id === form.purchaseOrderId);
                const poItem = selectedPo?.items?.find((i: any) => i.ingredientId === v);
                
                if (poItem) {
                  setNewItem({ ...newItem, productId: v, unitCost: poItem.unitPrice });
                } else {
                  setNewItem({ ...newItem, productId: v, unitCost: 0 });
                }
              }} 
              disabled={!form.purchaseOrderId}
              options={[
                { value: '', label: form.purchaseOrderId ? 'Select item from PO...' : 'Select PO first...' },
                ...(purchaseOrders.find((po: any) => po.id === form.purchaseOrderId)?.items?.map((i: any) => ({ value: i.ingredientId, label: `${i.ingredientName} (Bought: ${i.quantity})` })) || [])
              ]} 
              className="col-span-2" />
              <Input type="number" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })} min={1} placeholder="Qty" />
              <Input type="number" value={newItem.unitCost} disabled placeholder="Unit Cost" step="0.01" title="Locked to PO price" />
              <Select value={newItem.reason} onChange={(v) => setNewItem({ ...newItem, reason: v })} options={[{ value: 'damaged', label: 'Damaged' }, { value: 'expired', label: 'Expired' }, { value: 'defective', label: 'Defective' }, { value: 'wrong_item', label: 'Wrong Item' }, { value: 'other', label: 'Other' }]} />
              <Button size="sm" onClick={addItem} variant="primary">Add</Button>
            </div>
            {form.items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm py-1 border-b last:border-0">
                <span className="flex-1">{item.productName}</span>
                <span className="w-16 text-center">×{item.quantity}</span>
                <span className="w-20 text-center">{formatCurrency(item.unitCost)}</span>
                <Badge className="text-[10px]">{item.reason}</Badge>
                <button onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })} className="text-red-500">✕</button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 justify-end">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={form.items.length === 0}>
              Create Return ({form.items.length} items)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
