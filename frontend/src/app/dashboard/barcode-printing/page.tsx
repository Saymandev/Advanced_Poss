'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useGetMenuItemsQuery, useGenerateBarcodeMutation } from '@/lib/api/endpoints/menuItemsApi';
import Barcode from 'react-barcode';
import { toast } from 'react-hot-toast';
import { PrinterIcon, QrCodeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '@/lib/utils';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';

export default function BarcodePrintingPage() {
  // Use inventory or general POS feature flag if specific barcode one doesn't exist
  useFeatureRedirect('menu');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [printCopies, setPrintCopies] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading } = useGetMenuItemsQuery({
    search: debouncedSearch,
    limit: 10,
    page: 1,
  });

  const [generateBarcode, { isLoading: isGenerating }] = useGenerateBarcodeMutation();

  const handleGenerateBarcode = async (itemId: string) => {
    try {
      const res = await generateBarcode(itemId).unwrap();
      toast.success('Barcode generated successfully!');
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem({ ...selectedItem, barcode: res.barcode });
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to generate barcode');
    }
  };

  const handlePrint = () => {
    if (!selectedItem || !selectedItem.barcode) {
      toast.error('Please select an item with a valid barcode');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <QrCodeIcon className="w-8 h-8 text-primary-600" />
            Barcode Printing
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Print thermal labels for retail items
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Copies:</label>
            <Input 
              type="number" 
              min="1" 
              max="50" 
              value={printCopies} 
              onChange={(e) => setPrintCopies(parseInt(e.target.value) || 1)} 
              className="w-20"
            />
          </div>
          <Button 
            onClick={handlePrint}
            disabled={!selectedItem || !selectedItem.barcode}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PrinterIcon className="w-5 h-5" />
            Print Labels
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Item Selection */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search products by name or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Searching...</div>
              ) : ((data as any)?.items || (data as any)?.menuItems)?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No products found.</div>
              ) : (
                ((data as any)?.items || (data as any)?.menuItems)?.map((item: any) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors \${
                      selectedItem?.id === item.id 
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                        <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          <span>Price: {formatCurrency(item.price)}</span>
                          {item.sku && <span>SKU: {item.sku}</span>}
                          {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        {item.barcode ? (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                            {item.barcode}
                          </div>
                        ) : (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleGenerateBarcode(item.id); }}
                            disabled={isGenerating}
                          >
                            Generate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Preview & Print Area */}
        <Card className="print:hidden">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 border-b pb-2">Label Preview</h3>
            {selectedItem ? (
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg min-h-[200px]">
                {selectedItem.barcode ? (
                  <div className="bg-white p-4 shadow-sm border rounded">
                    <div className="text-center font-bold text-sm mb-1 text-black">{selectedItem.name.substring(0, 20)}</div>
                    <Barcode 
                      value={selectedItem.barcode} 
                      width={1.5} 
                      height={40} 
                      fontSize={12}
                      margin={0}
                      displayValue={true}
                    />
                    <div className="text-center font-bold mt-1 text-black">{formatCurrency(selectedItem.price)}</div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <QrCodeIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No barcode assigned</p>
                    <p className="text-sm mt-1">Generate one to preview</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                Select an item to preview
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hidden Print Area - Only visible during printing */}
      <div className="hidden print:block">
        <style dangerouslySetInnerHTML={{__html: `
          @page { size: auto; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
          .print\\\\:block { display: block !important; }
          .print\\\\:hidden { display: none !important; }
        `}} />
        {selectedItem?.barcode && (
          <div className="flex flex-wrap gap-4" ref={printRef}>
            {Array.from({ length: printCopies }).map((_, i) => (
              <div key={i} className="inline-flex flex-col items-center bg-white p-2" style={{ width: '1.5in', height: '1in', border: '1px dashed #ccc', boxSizing: 'border-box' }}>
                <div className="text-center font-bold text-[10px] truncate w-full px-1 text-black mb-1">{selectedItem.name.substring(0, 25)}</div>
                <Barcode 
                  value={selectedItem.barcode} 
                  width={1} 
                  height={30} 
                  fontSize={10}
                  margin={0}
                  displayValue={true}
                />
                <div className="text-center font-bold mt-1 text-[12px] text-black">{formatCurrency(selectedItem.price)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
