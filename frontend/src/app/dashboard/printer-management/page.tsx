'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCancelPrintJobMutation, useCreatePrinterMutation, useDeletePrinterMutation, useGetPrintersQuery, useGetPrintQueueQuery, useTestPrinterMutation, useUpdatePrinterMutation } from '@/lib/api/endpoints/posApi';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  PrinterIcon,
  StopIcon,
  TrashIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function PrinterManagementPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [printerToEdit, setPrinterToEdit] = useState<any>(null);
  const [printerToDelete, setPrinterToDelete] = useState<string>('');

  const { data: printers, isLoading: printersLoading, refetch: refetchPrinters } = useGetPrintersQuery();
  const { data: printQueue, isLoading: queueLoading, refetch: refetchQueue } = useGetPrintQueueQuery();
  const [testPrinter, { isLoading: testing }] = useTestPrinterMutation();
  const [cancelPrintJob] = useCancelPrintJobMutation();
  const [createPrinter, { isLoading: isCreating }] = useCreatePrinterMutation();
  const [updatePrinter, { isLoading: isUpdating }] = useUpdatePrinterMutation();
  const [deletePrinter, { isLoading: isDeleting }] = useDeletePrinterMutation();

  const [formData, setFormData] = useState({
    name: '',
    type: 'thermal',
    width: 80,
    height: 100,
    networkUrl: '',
    driver: '',
    enabled: true,
    copies: 1,
    priority: 'normal',
    autoPrint: false,
    description: '',
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) {
      setFormData({
        name: '',
        type: 'thermal',
        width: 80,
        height: 100,
        networkUrl: '',
        driver: '',
        enabled: true,
        copies: 1,
        priority: 'normal',
        autoPrint: false,
        description: '',
      });
      setPrinterToEdit(null);
    }
  }, [isAddModalOpen, isEditModalOpen]);

  // Populate form when editing
  useEffect(() => {
    if (isEditModalOpen && printerToEdit) {
      setFormData({
        name: printerToEdit.name || '',
        type: printerToEdit.type || 'thermal',
        width: printerToEdit.width || 80,
        height: printerToEdit.height || 100,
        networkUrl: printerToEdit.networkUrl || '',
        driver: printerToEdit.driver || '',
        enabled: printerToEdit.enabled ?? true,
        copies: printerToEdit.copies || 1,
        priority: printerToEdit.priority || 'normal',
        autoPrint: printerToEdit.autoPrint ?? false,
        description: printerToEdit.description || '',
      });
    }
  }, [isEditModalOpen, printerToEdit]);

  const handleAddPrinter = async () => {
    try {
      await createPrinter(formData).unwrap();
      toast.success('Printer added successfully');
      setIsAddModalOpen(false);
      refetchPrinters();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to add printer');
    }
  };

  const handleUpdatePrinter = async () => {
    if (!printerToEdit?.name) return;
    
    try {
      await updatePrinter({
        name: printerToEdit.name,
        data: formData,
      }).unwrap();
      toast.success('Printer updated successfully');
      setIsEditModalOpen(false);
      refetchPrinters();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update printer');
    }
  };

  const handleDeletePrinter = async () => {
    if (!printerToDelete) return;
    
    try {
      await deletePrinter(printerToDelete).unwrap();
      toast.success('Printer deleted successfully');
      setIsDeleteModalOpen(false);
      setPrinterToDelete('');
      refetchPrinters();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete printer');
    }
  };

  const handleTestPrinter = async () => {
    if (!selectedPrinter) {
      toast.error('Please select a printer');
      return;
    }
    
    try {
      const result = await testPrinter({ printerName: selectedPrinter }).unwrap();
      if (result.success) {
        toast.success(result.message || 'Printer test successful!');
        setIsTestModalOpen(false);
      } else {
        toast.error(result.message || 'Printer test failed');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Error testing printer');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      const result = await cancelPrintJob(jobId).unwrap();
      if (result.success) {
        toast.success(result.message || 'Print job cancelled successfully');
        refetchQueue();
      } else {
        toast.error(result.message || 'Failed to cancel print job');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Error cancelling print job');
    }
  };

  const handleEditPrinter = (printer: any) => {
    setPrinterToEdit(printer);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (printerName: string) => {
    setPrinterToDelete(printerName);
    setIsDeleteModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'yellow', icon: ClockIcon },
      printing: { color: 'blue', icon: PlayIcon },
      completed: { color: 'green', icon: CheckCircleIcon },
      failed: { color: 'red', icon: XCircleIcon },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.color as any} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPrinterTypeColor = (type: string) => {
    const colors = {
      thermal: 'bg-orange-100 text-orange-800',
      laser: 'bg-blue-100 text-blue-800',
      inkjet: 'bg-purple-100 text-purple-800',
      network: 'bg-green-100 text-green-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (printersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Printer Management</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Printer Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage printers and print jobs</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsTestModalOpen(true)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <PlayIcon className="w-4 h-4" />
            Test Printer
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Add Printer
          </Button>
        </div>
      </div>

      {/* Printers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {printers?.map((printer) => (
          <Card key={printer.name} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <PrinterIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{printer.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{printer.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={printer.isOnline ? 'success' : 'danger'}
                  className="text-xs"
                >
                  {printer.isOnline ? 'Online' : 'Offline'}
                </Badge>
                <Badge 
                  variant={printer.enabled ? 'info' : 'secondary'}
                  className="text-xs"
                >
                  {printer.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Width:</span>
                <span className="font-medium">{printer.width}mm</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPrinterTypeColor(printer.type)}`}>
                  {printer.type.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setSelectedPrinter(printer.name);
                  setIsTestModalOpen(true);
                }}
              >
                <PlayIcon className="w-4 h-4 mr-1" />
                Test
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => handleEditPrinter(printer)}
              >
                <PencilIcon className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                onClick={() => handleDeleteClick(printer.name)}
              >
                <TrashIcon className="w-4 h-4 mr-1 text-red-600" />
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Print Queue */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Print Queue</h2>
          <Button
            onClick={() => refetchQueue()}
            size="sm"
            variant="secondary"
          >
            Refresh
          </Button>
        </div>

        {queueLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : printQueue && printQueue.length > 0 ? (
          <div className="space-y-3">
            {printQueue.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {job.printerName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(job.status)}
                </div>
                <div className="flex items-center gap-2">
                  {job.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCancelJob(job.id)}
                    >
                      <StopIcon className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                  {job.error && (
                    <div className="flex items-center gap-1 text-red-600">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      <span className="text-sm">{job.error}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <PrinterIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No print jobs in queue</p>
          </div>
        )}
      </Card>

      {/* Test Printer Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Test Printer"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Printer
            </label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a printer...</option>
              {printers?.map((printer) => (
                <option key={printer.name} value={printer.name}>
                  {printer.name} ({printer.type})
                </option>
              ))}
            </select>
          </div>


          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsTestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestPrinter}
              disabled={!selectedPrinter || testing}
            >
              {testing ? 'Testing...' : 'Test Printer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Printer Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={isEditModalOpen ? 'Edit Printer' : 'Add New Printer'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Printer Name
            </label>
            <Input 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter printer name..."
              disabled={isEditModalOpen}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Printer Type
            </label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="thermal">Thermal Receipt Printer</option>
              <option value="laser">Laser Printer</option>
              <option value="inkjet">Inkjet Printer</option>
              <option value="network">Network Printer</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Paper Width (mm)
              </label>
              <Input 
                type="number" 
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                placeholder="80"
                min="10"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Paper Height (mm)
              </label>
              <Input 
                type="number" 
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                placeholder="100"
                min="10"
                max="1000"
              />
            </div>
          </div>

          {formData.type === 'network' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Network URL
              </label>
              <Input 
                value={formData.networkUrl}
                onChange={(e) => setFormData({ ...formData, networkUrl: e.target.value })}
                placeholder="http://192.168.1.100:9100"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Driver (Optional)
            </label>
            <Input 
              value={formData.driver}
              onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
              placeholder="Printer driver name..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <Input 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Copies
              </label>
              <Input 
                type="number" 
                value={formData.copies}
                onChange={(e) => setFormData({ ...formData, copies: Number(e.target.value) })}
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select 
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enabled
              </label>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto Print
              </label>
              <input
                type="checkbox"
                checked={formData.autoPrint}
                onChange={(e) => setFormData({ ...formData, autoPrint: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
              }}
              disabled={isCreating || isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditModalOpen ? handleUpdatePrinter : handleAddPrinter}
              disabled={isCreating || isUpdating || !formData.name}
            >
              {isCreating || isUpdating ? 'Saving...' : isEditModalOpen ? 'Update Printer' : 'Add Printer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPrinterToDelete('');
        }}
        title="Delete Printer"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete the printer <strong>{printerToDelete}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setPrinterToDelete('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeletePrinter}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
