'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import {
    useCreateDeliveryZoneMutation,
    useDeleteDeliveryZoneMutation,
    useGetDeliveryZonesByBranchQuery,
    useUpdateDeliveryZoneMutation,
    type DeliveryZone,
} from '@/lib/api/endpoints/deliveryZonesApi';
import { DeliveryOrder, DeliveryStatus, useAssignDeliveryDriverMutation, useGetDeliveryOrdersQuery, useUpdateDeliveryStatusMutation } from '@/lib/api/endpoints/posApi';
import { useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import { TruckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const DELIVERY_STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function DeliveriesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);

  // Require Delivery Management feature (separate from generic order-management)
  useFeatureRedirect('delivery-management');

  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('pending');
  const [driverFilter, setDriverFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    description: '',
    deliveryCharge: '',
    minimumOrderAmount: '',
    freeDeliveryAbove: '',
  });

  const { data: staffData } = useGetStaffQuery({ branchId: user?.branchId || '' }, { skip: !user?.branchId });
  const { data: deliveryOrders = [], isLoading, refetch } = useGetDeliveryOrdersQuery(
    {
      deliveryStatus: statusFilter || undefined,
      assignedDriverId: driverFilter || undefined,
    },
    {
      skip: !user?.branchId,
    }
  );

  const [assignDriver, { isLoading: assigning }] = useAssignDeliveryDriverMutation();
  const [updateDeliveryStatus, { isLoading: updatingStatus }] = useUpdateDeliveryStatusMutation();
  const [createDeliveryZone, { isLoading: isCreatingZone }] = useCreateDeliveryZoneMutation();
  const [updateDeliveryZone] = useUpdateDeliveryZoneMutation();
  const [deleteDeliveryZone, { isLoading: isDeletingZone }] = useDeleteDeliveryZoneMutation();

  const companyId = user?.companyId || (companyContext as any)?.companyId || '';
  const branchId = user?.branchId || (companyContext as any)?.branchId || '';

  const {
    data: deliveryZones = [],
    isLoading: zonesLoading,
    refetch: refetchZones,
  } = useGetDeliveryZonesByBranchQuery(
    { branchId },
    { skip: !branchId }
  );

  const drivers = useMemo(
    () =>
      (staffData?.staff || []).filter((s: any) => (s.role || '').toLowerCase().includes('driver') || (s.role || '').toLowerCase().includes('rider')),
    [staffData]
  );

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return deliveryOrders;
    const q = search.toLowerCase();
    return deliveryOrders.filter((order: DeliveryOrder) => {
      const parts = [
        order.orderNumber,
        order.customerInfo?.name,
        order.customerInfo?.phone,
        order.deliveryDetails?.addressLine1,
        order.deliveryDetails?.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return parts.includes(q);
    });
  }, [deliveryOrders, search]);

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    try {
      await assignDriver({ orderId, driverId }).unwrap();
      toast.success('Driver assigned successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to assign driver');
    }
  };

  const handleStatusChange = async (orderId: string, status: DeliveryStatus) => {
    if (!orderId) {
      toast.error('Invalid order ID');
      return;
    }
    try {
      await updateDeliveryStatus({ orderId, status }).unwrap();
      toast.success('Delivery status updated');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update delivery status');
    }
  };

  const handleCreateZone = async () => {
    if (!companyId) {
      toast.error('Company not found for current user');
      return;
    }
    if (!zoneForm.name.trim()) {
      toast.error('Zone name is required');
      return;
    }
    const charge = parseFloat(zoneForm.deliveryCharge || '0');
    if (Number.isNaN(charge) || charge < 0) {
      toast.error('Delivery charge must be a positive number');
      return;
    }

    try {
      if (editingZone) {
        await updateDeliveryZone({
          id: editingZone.id,
          data: {
            name: zoneForm.name.trim(),
            description: zoneForm.description.trim() || undefined,
            deliveryCharge: charge,
            minimumOrderAmount: zoneForm.minimumOrderAmount
              ? parseFloat(zoneForm.minimumOrderAmount)
              : undefined,
            freeDeliveryAbove: zoneForm.freeDeliveryAbove
              ? parseFloat(zoneForm.freeDeliveryAbove)
              : undefined,
          },
        }).unwrap();
        toast.success('Delivery zone updated');
      } else {
        await createDeliveryZone({
          companyId,
          branchId: branchId || undefined,
          name: zoneForm.name.trim(),
          description: zoneForm.description.trim() || undefined,
          deliveryCharge: charge,
          minimumOrderAmount: zoneForm.minimumOrderAmount
            ? parseFloat(zoneForm.minimumOrderAmount)
            : undefined,
          freeDeliveryAbove: zoneForm.freeDeliveryAbove
            ? parseFloat(zoneForm.freeDeliveryAbove)
            : undefined,
        }).unwrap();
        toast.success('Delivery zone created');
      }

      await refetchZones();
      setIsZoneModalOpen(false);
      setEditingZone(null);
      setZoneForm({
        name: '',
        description: '',
        deliveryCharge: '',
        minimumOrderAmount: '',
        freeDeliveryAbove: '',
      });
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save delivery zone');
    }
  };

  const columns = [
    {
      key: 'orderNumber',
      title: 'Order',
      header: 'Order',
      render: (_: any, record: DeliveryOrder) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">#{record.orderNumber}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(record.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      title: 'Customer',
      header: 'Customer',
      render: (_: any, record: DeliveryOrder) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{record.customerInfo?.name || 'Walk-in'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{record.customerInfo?.phone}</p>
        </div>
      ),
    },
    {
      key: 'address',
      title: 'Address',
      header: 'Address',
      render: (_: any, record: DeliveryOrder) => (
        <div className="text-xs text-gray-700 dark:text-gray-300">
          <p>{record.deliveryDetails?.addressLine1}</p>
          {record.deliveryDetails?.city && (
            <p className="text-gray-500 dark:text-gray-400">
              {record.deliveryDetails.city} {record.deliveryDetails.postalCode}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      title: 'Amount',
      header: 'Amount',
      render: (_: any, record: DeliveryOrder) => (
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {record.totalAmount.toFixed(2)}
        </div>
      ),
    },
    {
      key: 'deliveryStatus',
      title: 'Status',
      header: 'Status',
      render: (_: any, record: DeliveryOrder) => {
        const deliveryStatus = (record.deliveryStatus || 'pending') as DeliveryStatus;
        const paymentStatus = record.status || 'pending';
        const option = DELIVERY_STATUS_OPTIONS.find((o) => o.value === deliveryStatus);
        const variant =
          deliveryStatus === 'delivered'
            ? 'success'
            : deliveryStatus === 'out_for_delivery'
            ? 'info'
            : deliveryStatus === 'cancelled'
            ? 'danger'
            : deliveryStatus === 'assigned'
            ? 'warning'
            : deliveryStatus === 'confirmed'
            ? 'info'
            : 'secondary';
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={variant}>{option?.label || deliveryStatus}</Badge>
              {paymentStatus === 'paid' && (
                <Badge variant="success" className="text-xs">Paid</Badge>
              )}
              {paymentStatus === 'pending' && (
                <Badge variant="warning" className="text-xs">Payment Pending</Badge>
              )}
            </div>
            {deliveryStatus === 'pending' && record.isPublic && (
              <Button
                size="sm"
                className="w-full mt-2 bg-sky-600 hover:bg-sky-500 text-xs py-1 h-7"
                onClick={() => handleStatusChange(record.id, 'confirmed')}
                disabled={updatingStatus}
              >
                Confirm Order
              </Button>
            )}
            <select
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs px-2 py-1"
              value={deliveryStatus}
              onChange={(e) => {
                const orderId = record.id;
                if (orderId) {
                  handleStatusChange(orderId, e.target.value as DeliveryStatus);
                } else {
                  toast.error('Order ID not found');
                }
              }}
              disabled={updatingStatus}
            >
              {DELIVERY_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      },
    },
    {
      key: 'driver',
      title: 'Driver',
      header: 'Driver',
      render: (_: any, record: DeliveryOrder) => {
        const assignedId = record.assignedDriverId || record.deliveryDetails?.assignedDriver;
        return (
          <div className="space-y-1">
            <select
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs px-2 py-1"
              value={assignedId || ''}
              onChange={(e) => {
                const orderId = record.id;
                if (orderId) {
                  handleAssignDriver(orderId, e.target.value);
                } else {
                  toast.error('Order ID not found');
                }
              }}
              disabled={assigning || drivers.length === 0}
            >
              <option value="">{drivers.length ? 'Select driver' : 'No drivers'}</option>
              {drivers.map((driver: any) => (
                <option key={driver.id} value={driver.id}>
                  {driver.firstName} {driver.lastName}
                </option>
              ))}
            </select>
            {record.assignedAt && (
              <p className="text-[10px] text-gray-500 dark:text-gray-500">
                Assigned at {formatDateTime(record.assignedAt)}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  const myActiveDeliveriesCount = useMemo(() => {
    if (!user?.id) return 0;
    return deliveryOrders.filter((order) => {
      const assignedId = order.assignedDriverId || order.deliveryDetails?.assignedDriver;
      const active =
        order.deliveryStatus === 'pending' ||
        order.deliveryStatus === 'assigned' ||
        order.deliveryStatus === 'out_for_delivery' ||
        !order.deliveryStatus; // treat undefined as active/pending
      return assignedId === user.id && active;
    }).length;
  }, [deliveryOrders, user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3">
            <TruckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Delivery Management</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Track delivery orders, assign drivers, and update delivery status.
              </p>
            </div>
          </div>
          {myActiveDeliveriesCount > 0 && (
            <Badge variant="info" className="text-xs whitespace-nowrap">
              You have {myActiveDeliveriesCount} active delivery{myActiveDeliveriesCount > 1 ? 'ies' : ''}
            </Badge>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="w-full sm:w-auto text-sm">
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsZoneModalOpen(true)}
            className="w-full sm:w-auto text-sm"
          >
            New Delivery Zone
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm px-3 py-2 w-full sm:w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | '')}
            >
              <option value="">All Statuses</option>
              {DELIVERY_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs sm:text-sm px-3 py-2 w-full sm:w-auto"
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
            >
              <option value="">All Drivers</option>
              {drivers.map((driver: any) => (
                <option key={driver.id} value={driver.id}>
                  {driver.firstName} {driver.lastName}
                </option>
              ))}
            </select>

            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by order, customer or address"
              className="w-full sm:w-64 text-sm sm:text-base"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading delivery orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-10">
              <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No delivery orders found</p>
            </div>
          ) : (
            <DataTable data={filteredOrders} columns={columns} loading={false} searchable={false} />
          )}
        </CardContent>
      </Card>

      {/* Delivery Zones List */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Zones</CardTitle>
        </CardHeader>
        <CardContent>
          {zonesLoading ? (
            <div className="text-center py-6 text-sm text-gray-600 dark:text-gray-400">
              Loading zones...
            </div>
          ) : deliveryZones.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-600 dark:text-gray-400">
              No delivery zones configured yet. Click &quot;New Delivery Zone&quot; to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {deliveryZones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                      {zone.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                      Charge: {zone.deliveryCharge.toFixed(2)}{' '}
                      {zone.minimumOrderAmount
                        ? `• Min order: ${zone.minimumOrderAmount.toFixed(2)}`
                        : ''}
                      {zone.freeDeliveryAbove
                        ? ` • Free above: ${zone.freeDeliveryAbove.toFixed(2)}`
                        : ''}
                    </p>
                    {zone.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                        {zone.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingZone(zone);
                        setZoneForm({
                          name: zone.name,
                          description: zone.description || '',
                          deliveryCharge: zone.deliveryCharge.toString(),
                          minimumOrderAmount: zone.minimumOrderAmount?.toString() || '',
                          freeDeliveryAbove: zone.freeDeliveryAbove?.toString() || '',
                        });
                        setIsZoneModalOpen(true);
                      }}
                      className="text-xs sm:text-sm"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isDeletingZone}
                      onClick={async () => {
                        if (!window.confirm(`Delete zone "${zone.name}"?`)) return;
                        try {
                          await deleteDeliveryZone(zone.id).unwrap();
                          toast.success('Delivery zone deleted');
                          await refetchZones();
                        } catch (error: any) {
                          toast.error(error?.data?.message || 'Failed to delete delivery zone');
                        }
                      }}
                      className="text-xs sm:text-sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Delivery Zone Modal */}
      <Modal
        isOpen={isZoneModalOpen}
        onClose={() => {
          setIsZoneModalOpen(false);
          setEditingZone(null);
          setZoneForm({
            name: '',
            description: '',
            deliveryCharge: '',
            minimumOrderAmount: '',
            freeDeliveryAbove: '',
          });
        }}
        title={editingZone ? "Edit Delivery Zone" : "Create Delivery Zone"}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zone Name *
            </label>
            <Input
              value={zoneForm.name}
              onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
              placeholder="e.g. Downtown Zone"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <Input
              value={zoneForm.description}
              onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
              placeholder="Optional description (e.g. coverage notes)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Delivery Charge *
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={zoneForm.deliveryCharge}
                onChange={(e) => setZoneForm({ ...zoneForm, deliveryCharge: e.target.value })}
                placeholder="0.00"
                className="text-sm sm:text-base"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum Order Amount
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={zoneForm.minimumOrderAmount}
                onChange={(e) => setZoneForm({ ...zoneForm, minimumOrderAmount: e.target.value })}
                placeholder="Optional"
                className="text-sm sm:text-base"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Free Delivery Above
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={zoneForm.freeDeliveryAbove}
                onChange={(e) => setZoneForm({ ...zoneForm, freeDeliveryAbove: e.target.value })}
                placeholder="Optional"
                className="text-sm sm:text-base"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsZoneModalOpen(false);
                setEditingZone(null);
                setZoneForm({
                  name: '',
                  description: '',
                  deliveryCharge: '',
                  minimumOrderAmount: '',
                  freeDeliveryAbove: '',
                });
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateZone}
              disabled={isCreatingZone}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {isCreatingZone ? 'Creating...' : editingZone ? 'Update Zone' : 'Create Zone'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


