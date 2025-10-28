'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useGetPOSSettingsQuery, useGetPrintersQuery, useTestPrinterMutation, useUpdatePOSSettingsMutation } from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import {
  CheckIcon,
  CogIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  ReceiptPercentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function POSSettingsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTestPrintModalOpen, setIsTestPrintModalOpen] = useState(false);
  const [isTestReceiptModalOpen, setIsTestReceiptModalOpen] = useState(false);
  const [selectedPrinterForTest, setSelectedPrinterForTest] = useState('');
  const [isTestingPrint, setIsTestingPrint] = useState(false);

  const { data: settings, isLoading, refetch: refetchSettings } = useGetPOSSettingsQuery({
    branchId: user?.branchId || undefined,
  });
  
  const { data: printers, isLoading: printersLoading } = useGetPrintersQuery();
  const [testPrinter] = useTestPrinterMutation();

  const [updateSettings, { isLoading: isSaving }] = useUpdatePOSSettingsMutation();

  const [formData, setFormData] = useState({
    taxRate: 10,
    serviceCharge: 0,
    currency: 'USD',
    receiptHeader: 'Welcome to Our Restaurant',
    receiptFooter: 'Thank you for your visit!',
    showLogo: true,
    logoUrl: '',
    fontSize: 12,
    paperWidth: 80,
    printerEnabled: false,
    printerId: '',
    printerType: 'thermal' as 'thermal' | 'laser' | 'inkjet',
    paperSize: '80mm' as '58mm' | '80mm' | 'A4',
    autoPrint: false,
  });
  
  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      const settingsData = settings as any;
      setFormData({
        taxRate: settingsData.taxRate || 10,
        serviceCharge: settingsData.serviceCharge || 0,
        currency: settingsData.currency || 'USD',
        receiptHeader: settingsData.receiptSettings?.header || 'Welcome to Our Restaurant',
        receiptFooter: settingsData.receiptSettings?.footer || 'Thank you for your visit!',
        showLogo: settingsData.receiptSettings?.showLogo ?? true,
        logoUrl: settingsData.receiptSettings?.logoUrl || '',
        fontSize: settingsData.receiptSettings?.fontSize || 12,
        paperWidth: settingsData.receiptSettings?.paperWidth || 80,
        printerEnabled: settingsData.printerSettings?.enabled ?? false,
        printerId: settingsData.printerSettings?.printerId || '',
        printerType: settingsData.printerSettings?.printerType || 'thermal',
        paperSize: settingsData.printerSettings?.paperSize || '80mm',
        autoPrint: settingsData.printerSettings?.autoPrint ?? false,
      });
    }
  }, [settings]);
  
  // Set default printer for test when printers load
  useEffect(() => {
    if (printers && printers.length > 0 && !selectedPrinterForTest) {
      const enabledPrinter = printers.find(p => p.enabled && p.isOnline);
      if (enabledPrinter) {
        setSelectedPrinterForTest(enabledPrinter.name);
      } else if (formData.printerId) {
        setSelectedPrinterForTest(formData.printerId);
      } else {
        setSelectedPrinterForTest(printers[0].name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printers, formData.printerId]);

  const handleSaveSettings = async () => {
    try {
      // Validation
      if (formData.taxRate < 0 || formData.taxRate > 100) {
        toast.error('Tax rate must be between 0 and 100');
        return;
      }
      if (formData.serviceCharge < 0 || formData.serviceCharge > 100) {
        toast.error('Service charge must be between 0 and 100');
        return;
      }
      if (formData.fontSize < 8 || formData.fontSize > 24) {
        toast.error('Font size must be between 8 and 24');
        return;
      }
      
      await updateSettings({
        taxRate: formData.taxRate,
        serviceCharge: formData.serviceCharge,
        currency: formData.currency,
        receiptSettings: {
          header: formData.receiptHeader,
          footer: formData.receiptFooter,
          showLogo: formData.showLogo,
          logoUrl: formData.logoUrl,
          fontSize: formData.fontSize,
          paperWidth: formData.paperWidth,
        },
        printerSettings: {
          enabled: formData.printerEnabled,
          printerId: formData.printerId,
          autoPrint: formData.autoPrint,
          printerType: formData.printerType,
          paperSize: formData.paperSize,
        },
      }).unwrap();

      toast.success('Settings saved successfully');
      setIsEditModalOpen(false);
      refetchSettings();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save settings');
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinterForTest) {
      toast.error('Please select a printer');
      return;
    }
    
    setIsTestingPrint(true);
    try {
      const result = await testPrinter({ printerName: selectedPrinterForTest }).unwrap();
      if (result.success) {
        toast.success(result.message || 'Test print sent successfully');
        setIsTestPrintModalOpen(false);
      } else {
        toast.error(result.message || 'Test print failed');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Test print failed');
    } finally {
      setIsTestingPrint(false);
    }
  };

  const handleTestReceipt = () => {
    setIsTestReceiptModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POS Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure your POS system preferences</p>
        </div>
        <Button
          onClick={() => {
            setIsEditModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <CogIcon className="h-4 w-4" />
          Edit Settings
        </Button>
      </div>

      {/* Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tax & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptPercentIcon className="h-5 w-5" />
              Tax & Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Rate (%)
              </label>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {settings?.taxRate || 10}%
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Charge (%)
              </label>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {settings?.serviceCharge || 0}%
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {settings?.currency || 'USD'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptPercentIcon className="h-5 w-5" />
              Receipt Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Header Text
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings?.receiptSettings?.header || 'Welcome to Our Restaurant'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Footer Text
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings?.receiptSettings?.footer || 'Thank you for your visit!'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Show Logo
              </label>
              <div className="flex items-center gap-2">
                {settings?.receiptSettings?.showLogo ? (
                  <CheckIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <XMarkIcon className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {settings?.receiptSettings?.showLogo ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            {(settings as any)?.receiptSettings?.logoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Logo URL
                </label>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {(settings as any).receiptSettings.logoUrl}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Printer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PrinterIcon className="h-5 w-5" />
              Printer Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Printer Status
              </label>
              <div className="flex items-center gap-2">
                {settings?.printerSettings?.enabled ? (
                  <CheckIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <XMarkIcon className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {settings?.printerSettings?.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Printer
              </label>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {settings?.printerSettings?.printerId || 'Not configured'}
              </div>
              {(settings as any)?.printerSettings?.printerType && (
                <div className="text-xs text-gray-500 mt-1">
                  Type: {(settings as any).printerSettings.printerType}
                  {(settings as any).printerSettings.paperSize && ` • Paper: ${(settings as any).printerSettings.paperSize}`}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Auto Print
              </label>
              <div className="flex items-center gap-2">
                {settings?.printerSettings?.autoPrint ? (
                  <CheckIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <XMarkIcon className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {settings?.printerSettings?.autoPrint ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
            <div className="pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsTestPrintModalOpen(true)}
                className="w-full"
                disabled={!settings?.printerSettings?.enabled}
              >
                Test Print
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CogIcon className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="secondary"
              onClick={handleTestReceipt}
              className="w-full flex items-center gap-2"
            >
              <ReceiptPercentIcon className="h-4 w-4" />
              Preview Receipt
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIsTestPrintModalOpen(true)}
              className="w-full flex items-center gap-2"
              disabled={!settings?.printerSettings?.enabled}
            >
              <PrinterIcon className="h-4 w-4" />
              Test Printer
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.open('/dashboard/pos', '_blank')}
              className="w-full flex items-center gap-2"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              Open POS
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Edit Settings Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit POS Settings"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax Rate (%)
              </label>
              <Input
                type="number"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service Charge (%)
              </label>
              <Input
                type="number"
                value={formData.serviceCharge}
                onChange={(e) => setFormData({ ...formData, serviceCharge: Number(e.target.value) })}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="AUD">AUD - Australian Dollar</option>
              <option value="BDT">BDT - Bangladeshi Taka</option>
              <option value="INR">INR - Indian Rupee</option>
              <option value="PKR">PKR - Pakistani Rupee</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Logo URL (Optional)
            </label>
            <Input
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
              type="url"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Font Size (px)
              </label>
              <Input
                type="number"
                value={formData.fontSize}
                onChange={(e) => setFormData({ ...formData, fontSize: Number(e.target.value) })}
                min="8"
                max="24"
                step="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Paper Width (mm)
              </label>
              <Input
                type="number"
                value={formData.paperWidth}
                onChange={(e) => setFormData({ ...formData, paperWidth: Number(e.target.value) })}
                min="58"
                max="210"
                step="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Receipt Header
            </label>
            <Input
              value={formData.receiptHeader}
              onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
              placeholder="Enter receipt header text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Receipt Footer
            </label>
            <Input
              value={formData.receiptFooter}
              onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
              placeholder="Enter receipt footer text"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Show Logo on Receipt
              </label>
              <input
                type="checkbox"
                checked={formData.showLogo}
                onChange={(e) => setFormData({ ...formData, showLogo: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Printer
              </label>
              <input
                type="checkbox"
                checked={formData.printerEnabled}
                onChange={(e) => setFormData({ ...formData, printerEnabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto Print Receipts
              </label>
              <input
                type="checkbox"
                checked={formData.autoPrint}
                onChange={(e) => setFormData({ ...formData, autoPrint: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>

          {formData.printerEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Printer
                </label>
                {printersLoading ? (
                  <div className="text-sm text-gray-500">Loading printers...</div>
                ) : printers && printers.length > 0 ? (
                  <select
                    value={formData.printerId}
                    onChange={(e) => setFormData({ ...formData, printerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Select a printer</option>
                    {printers.map((printer) => (
                      <option key={printer.name} value={printer.name}>
                        {printer.name} {printer.type && `(${printer.type})`} {!printer.isOnline && '(Offline)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div>
                    <div className="text-sm text-yellow-600 mb-2 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      No printers found. Please install a printer driver.
                    </div>
                    <Input
                      value={formData.printerId}
                      onChange={(e) => setFormData({ ...formData, printerId: e.target.value })}
                      placeholder="Enter printer name manually"
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Printer Type
                  </label>
                  <select
                    value={formData.printerType}
                    onChange={(e) => setFormData({ ...formData, printerType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="thermal">Thermal</option>
                    <option value="laser">Laser</option>
                    <option value="inkjet">Inkjet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Paper Size
                  </label>
                  <select
                    value={formData.paperSize}
                    onChange={(e) => setFormData({ ...formData, paperSize: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="58mm">58mm</option>
                    <option value="80mm">80mm</option>
                    <option value="A4">A4</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Print Modal */}
      <Modal
        isOpen={isTestPrintModalOpen}
        onClose={() => setIsTestPrintModalOpen(false)}
        title="Test Print"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            This will send a test print to your configured printer. Make sure the printer is connected and ready.
          </p>
          
          {printers && printers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Printer
              </label>
              <select
                value={selectedPrinterForTest}
                onChange={(e) => setSelectedPrinterForTest(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.name} {printer.type && `(${printer.type})`} {!printer.isOnline && '(Offline)'}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Test Receipt Preview:</h4>
            <div className="text-sm font-mono">
              <div className="text-center mb-2">=== TEST RECEIPT ===</div>
              <div>Date: {new Date().toLocaleString()}</div>
              <div>Printer: {selectedPrinterForTest || settings?.printerSettings?.printerId || 'Default'}</div>
              <div>Status: Ready</div>
              <div className="text-center mt-2">=== END TEST ===</div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsTestPrintModalOpen(false)}
              disabled={isTestingPrint}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestPrint}
              className="bg-green-600 hover:bg-green-700"
              disabled={isTestingPrint || !selectedPrinterForTest}
            >
              {isTestingPrint ? 'Printing...' : 'Send Test Print'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Receipt Modal */}
      <Modal
        isOpen={isTestReceiptModalOpen}
        onClose={() => setIsTestReceiptModalOpen(false)}
        title="Receipt Preview"
      >
        <div className="space-y-4">
          <div className="bg-white border-2 border-gray-300 p-4 font-mono text-sm">
            <div className="text-center font-bold text-lg mb-2">
              {settings?.receiptSettings?.header || 'Welcome to Our Restaurant'}
            </div>
            <div className="text-center text-xs mb-4">
              {new Date().toLocaleString()}
            </div>
            <div className="border-t border-gray-300 pt-2 mb-2">
              <div className="flex justify-between">
                <span>Item 1</span>
                <span>$10.00</span>
              </div>
              <div className="flex justify-between">
                <span>Item 2</span>
                <span>$15.00</span>
              </div>
            </div>
            <div className="border-t border-gray-300 pt-2 mb-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>$25.00</span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({settings?.taxRate || 10}%):</span>
                <span>${((25 * (settings?.taxRate || 10)) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${(25 + (25 * (settings?.taxRate || 10)) / 100).toFixed(2)}</span>
              </div>
            </div>
            <div className="text-center text-xs mt-4">
              {settings?.receiptSettings?.footer || 'Thank you for your visit!'}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsTestReceiptModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
