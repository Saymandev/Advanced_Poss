'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useGetCategoriesQuery } from '@/lib/api/endpoints/categoriesApi';
import {
    useCreatePOSOrderMutation,
    useDownloadReceiptPDFMutation,
    useGetAvailableTablesQuery,
    useGetPOSMenuItemsQuery,
    useGetPOSSettingsQuery,
    useGetPrintersQuery,
    useGetReceiptHTMLQuery,
    usePrintReceiptMutation,
    usePrintReceiptPDFMutation,
    useProcessPaymentMutation
} from '@/lib/api/endpoints/posApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
    CheckIcon,
    ClockIcon,
    CreditCardIcon,
    DocumentArrowDownIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    MinusIcon,
    PlusIcon,
    PrinterIcon,
    ShoppingCartIcon,
    TableCellsIcon,
    TrashIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  category: string;
}

interface OrderSummary {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

export default function POSPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  // API calls
  const { data: tablesData, isLoading: tablesLoading } = useGetAvailableTablesQuery({
    branchId: user?.branchId || undefined,
  });

  const { data: categoriesData } = useGetCategoriesQuery({
    branchId: user?.branchId || undefined,
  });

  const { data: menuItemsData, isLoading: menuItemsLoading } = useGetPOSMenuItemsQuery({
    branchId: user?.branchId || undefined,
    categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
    search: searchQuery || undefined,
    isAvailable: true,
  });
  
  // Get POS settings for tax rate
  const { data: posSettings } = useGetPOSSettingsQuery({
    branchId: user?.branchId || undefined,
  });
  
  const taxRate = posSettings?.taxRate || 10; // Default 10%
  
  // Extract tables array from response
  const tables = useMemo(() => {
    if (!tablesData) return [];
    const data = tablesData as any;
    if (Array.isArray(tablesData)) return tablesData;
    return data.data || data.tables || [];
  }, [tablesData]);
  
  // Extract categories array from response
  const categories = useMemo(() => {
    if (!categoriesData) return [];
    const data = categoriesData as any;
    if (Array.isArray(categoriesData)) return categoriesData;
    return data.data?.categories || data.categories || [];
  }, [categoriesData]);

  const [createOrder] = useCreatePOSOrderMutation();
  const [processPayment] = useProcessPaymentMutation();
  const [printReceipt] = usePrintReceiptMutation();
  const [printReceiptPDF] = usePrintReceiptPDFMutation();
  const [downloadReceiptPDF] = useDownloadReceiptPDFMutation();
  const { data: printers } = useGetPrintersQuery();
  const { data: receiptHTML } = useGetReceiptHTMLQuery(currentOrderId, {
    skip: !currentOrderId,
  });

  // Extract menu items array from response (handle different response formats)
  const menuItemsArray = useMemo(() => {
    if (!menuItemsData) return [];
    if (Array.isArray(menuItemsData)) {
      return menuItemsData;
    }
    const data = menuItemsData as any;
    // Handle { success: true, data: [...] } format
    return data.data || data.menuItems || [];
  }, [menuItemsData]);

  // Filter menu items based on search
  const filteredMenuItems = useMemo(() => {
    if (!Array.isArray(menuItemsArray)) return [];
    
    return menuItemsArray.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menuItemsArray, searchQuery]);

  // Debug: Log menu items data (remove in production)
  useEffect(() => {
    if (menuItemsData !== undefined) {
      console.log('POS Menu Items Data:', {
        raw: menuItemsData,
        isArray: Array.isArray(menuItemsData),
        extractedArray: menuItemsArray,
        count: Array.isArray(menuItemsArray) ? menuItemsArray.length : 0,
        filtered: filteredMenuItems.length,
      });
    }
  }, [menuItemsData, menuItemsArray, filteredMenuItems.length]);

  // Calculate order summary
  const orderSummary: OrderSummary = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        const itemTotal = item.price * item.quantity;
        const itemTax = (itemTotal * taxRate) / 100;
        return {
          subtotal: acc.subtotal + itemTotal,
          tax: acc.tax + itemTax,
          total: acc.total + itemTotal + itemTax,
          itemCount: acc.itemCount + item.quantity,
        };
      },
      { subtotal: 0, tax: 0, total: 0, itemCount: 0 }
    );
  }, [cart, taxRate]);

  // Cart functions
  const addToCart = (menuItem: any) => {
    const existingItem = cart.find(item => item.menuItemId === menuItem.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.menuItemId === menuItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: Date.now().toString(),
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        category: menuItem.category?.name || 'Uncategorized',
      };
      setCart([...cart, newItem]);
    }
    toast.success(`${menuItem.name} added to cart`);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    toast.success('Cart cleared');
  };

  // Order functions
  const handleCreateOrder = useCallback(async () => {
    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const orderData = {
        tableId: selectedTable,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
        customerInfo,
        totalAmount: orderSummary.total,
        status: 'pending' as const,
      };

      const orderResponse = await createOrder(orderData).unwrap();
      const order = (orderResponse as any).data || orderResponse;
      toast.success(`Order created successfully! Order #${order.orderNumber || order.id}`);
      clearCart();
      setSelectedTable('');
      setCustomerInfo({ name: '', phone: '', email: '' });
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create order');
    }
  }, [selectedTable, cart, customerInfo, orderSummary.total, createOrder]);

  const handlePayment = async () => {
    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      // Create order first
      const orderData = {
        tableId: selectedTable,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes,
        })),
        customerInfo,
        totalAmount: orderSummary.total,
        status: 'paid' as const,
        paymentMethod,
      };

      const orderResponse = await createOrder(orderData).unwrap();
      const order = (orderResponse as any).data || orderResponse;
      const orderId = order.id || order._id;
      
      // Process payment
      await processPayment({
        orderId,
        amount: orderSummary.total,
        method: paymentMethod,
      }).unwrap();

      // Print receipt (optional - don't fail if it fails)
      try {
        await printReceipt({
          orderId,
        }).unwrap();
        toast.success('Receipt printed successfully');
      } catch (error) {
        console.warn('Receipt printing failed:', error);
        // Don't fail the entire transaction if receipt printing fails
      }

      // Set current order ID for receipt viewing
      setCurrentOrderId(orderId);

      toast.success('Order completed successfully');
      // Show receipt option after a short delay
      setTimeout(() => {
        if (confirm('Would you like to view the receipt?')) {
          handleViewReceipt(order.id);
        }
      }, 1000);
      clearCart();
      setSelectedTable('');
      setCustomerInfo({ name: '', phone: '', email: '' });
      setIsPaymentModalOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to process payment');
    }
  };

  const handlePrintReceipt = async (orderId: string, usePDF = false) => {
    try {
      if (usePDF) {
        const result = await printReceiptPDF({
          orderId,
          printerId: selectedPrinter || undefined,
        }).unwrap();
        toast.success(result.message);
      } else {
        const result = await printReceipt({
          orderId,
          printerId: selectedPrinter || undefined,
        }).unwrap();
        toast.success(result.message);
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Failed to print receipt. Please try again.');
    }
  };

  const handleDownloadReceiptPDF = async (orderId: string) => {
    try {
      const blob = await downloadReceiptPDF(orderId).unwrap();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Receipt PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt PDF:', error);
      toast.error('Failed to download receipt PDF. Please try again.');
    }
  };

  const handleViewReceipt = (orderId: string) => {
    setCurrentOrderId(orderId);
    setIsReceiptModalOpen(true);
  };

  const getTableStatus = (table: any) => {
    if (table.status === 'occupied') return 'bg-red-100 text-red-800';
    if (table.status === 'reserved') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getTableStatusText = (table: any) => {
    if (table.status === 'occupied') return 'Occupied';
    if (table.status === 'reserved') return 'Reserved';
    return 'Available';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'F1':
          event.preventDefault();
          setIsTableModalOpen(true);
          break;
        case 'F2':
          event.preventDefault();
          if (cart.length > 0) {
            setIsPaymentModalOpen(true);
          }
          break;
        case 'F3':
          event.preventDefault();
          clearCart();
          break;
        case 'F4':
          event.preventDefault();
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          break;
        case 'Escape':
          event.preventDefault();
          setIsPaymentModalOpen(false);
          setIsTableModalOpen(false);
          setShowKeyboardShortcuts(false);
          break;
        case 'Enter':
          event.preventDefault();
          if (cart.length > 0 && selectedTable) {
            handleCreateOrder();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [cart.length, selectedTable, showKeyboardShortcuts, handleCreateOrder]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POS System</h1>
            <div className="flex items-center gap-2">
              <TableCellsIcon className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTable ? `Table ${tables.find((t: any) => t.id === selectedTable)?.number || tables.find((t: any) => t.id === selectedTable)?.tableNumber || selectedTable}` : 'No table selected'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsTableModalOpen(true)}
              className="flex items-center gap-2"
            >
              <TableCellsIcon className="h-4 w-4" />
              Select Table (F1)
            </Button>
            <Button
              variant="secondary"
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              Clear Cart (F3)
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowKeyboardShortcuts(true)}
              className="flex items-center gap-2"
            >
              ⌨️ Shortcuts (F4)
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Menu Items */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <FunnelIcon className="h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {menuItemsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-32 bg-gray-200 rounded mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredMenuItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMenuItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-gray-400 text-4xl">🍽️</div>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(item.price)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => addToCart(item)}
                          className="flex items-center gap-1"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No menu items found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery 
                    ? 'Try adjusting your search or filters'
                    : 'Menu items will appear here once they are added'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Cart and Order Summary */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Order Cart
              </h2>
              <Badge className="bg-blue-100 text-blue-800">
                {cart.length} items
              </Badge>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <ShoppingCartIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Your cart is empty</p>
                <p className="text-sm">Add items from the menu to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCurrency(item.price)} each
                        </p>
                        {item.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-8 w-8 p-0"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(orderSummary.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tax ({taxRate}%):</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(orderSummary.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-green-600">
                    {formatCurrency(orderSummary.total)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleCreateOrder}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedTable}
                >
                  <ClockIcon className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
                <Button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={!selectedTable}
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  Pay Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Selection Modal */}
      <Modal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        title="Select Table"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tablesLoading ? (
              [...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
              ))
            ) : tables.length > 0 ? (
              tables.map((table: any) => (
                <button
                  key={table.id}
                  onClick={() => {
                    setSelectedTable(table.id);
                    setIsTableModalOpen(false);
                  }}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedTable === table.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Table {table.number || table.tableNumber || table.id}
                    </div>
                    <Badge className={`mt-1 ${getTableStatus(table)}`}>
                      {getTableStatusText(table)}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
                No tables available
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Payment Details"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === 'cash' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('cash')}
                className="flex items-center gap-2"
              >
                💵 Cash
              </Button>
              <Button
                variant={paymentMethod === 'card' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('card')}
                className="flex items-center gap-2"
              >
                <CreditCardIcon className="h-4 w-4" />
                Card
              </Button>
              <Button
                variant={paymentMethod === 'split' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('split')}
                className="flex items-center gap-2"
              >
                <UserGroupIcon className="h-4 w-4" />
                Split
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Customer Name (Optional)
            </label>
            <Input
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number (Optional)
            </label>
            <Input
              value={customerInfo.phone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-green-600">{formatCurrency(orderSummary.total)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Process Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        title="Keyboard Shortcuts"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Navigation</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Select Table</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F1</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Payment Modal</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F2</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Clear Cart</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F3</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Show Shortcuts</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">F4</kbd>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Actions</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Create Order</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Close Modals</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Search Menu</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+F</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Quick Add</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Space</kbd>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 <strong>Tip:</strong> Use keyboard shortcuts to speed up order processing. 
              Focus on menu items and press Space to quickly add to cart.
            </p>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Receipt Preview"
        size="lg"
      >
        <div className="space-y-4">
          {receiptHTML?.html ? (
            <div className="border rounded-lg p-4 bg-white">
              <div 
                dangerouslySetInnerHTML={{ __html: receiptHTML.html }}
                className="receipt-preview"
                style={{
                  fontFamily: 'Courier New, monospace',
                  fontSize: '12px',
                  lineHeight: '1.3',
                  maxWidth: '300px',
                  margin: '0 auto',
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Loading receipt...</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              onClick={() => handlePrintReceipt(currentOrderId, false)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <PrinterIcon className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button
              onClick={() => handlePrintReceipt(currentOrderId, true)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <PrinterIcon className="w-4 h-4" />
              Print PDF
            </Button>
            <Button
              onClick={() => handleDownloadReceiptPDF(currentOrderId)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              Download PDF
            </Button>
          </div>

          {printers && Array.isArray(printers) && printers.length > 0 && (
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Printer (Optional)
              </label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Default Printer</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.name} ({printer.type}) - {printer.isOnline ? 'Online' : 'Offline'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
