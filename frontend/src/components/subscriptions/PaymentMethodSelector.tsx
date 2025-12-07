'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  PaymentGateway,
  SubscriptionPaymentMethod,
  useGetSubscriptionPaymentMethodsQuery,
} from '@/lib/api/endpoints/subscriptionPaymentsApi';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface PaymentMethodSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: SubscriptionPaymentMethod) => void;
  amount: number;
  currency: string;
  country?: string;
}

export function PaymentMethodSelector({
  isOpen,
  onClose,
  onSelect,
  amount,
  currency,
  country,
}: PaymentMethodSelectorProps) {
  const { data: paymentMethods, isLoading } = useGetSubscriptionPaymentMethodsQuery({
    country: country || 'BD',
    currency: currency || 'BDT',
  });

  // Auto-select default payment method (Stripe) when modal opens
  const defaultMethod = paymentMethods?.find((method) => method.isDefault) || paymentMethods?.[0];
  const [selectedMethod, setSelectedMethod] = useState<SubscriptionPaymentMethod | null>(null);

  // Update selected method when payment methods load or modal opens
  useEffect(() => {
    if (isOpen && defaultMethod && !selectedMethod) {
      setSelectedMethod(defaultMethod);
    }
  }, [isOpen, defaultMethod, selectedMethod]);

  const handleSelect = (method: SubscriptionPaymentMethod) => {
    setSelectedMethod(method);
  };

  const handleConfirm = () => {
    console.log('🔵 PaymentMethodSelector handleConfirm called', { selectedMethod });
    if (selectedMethod) {
      console.log('🔵 Calling onSelect with method:', selectedMethod);
      onSelect(selectedMethod);
      onClose();
    } else {
      console.error('🔴 No payment method selected');
    }
  };

  // Group payment methods by type
  const groupedMethods = paymentMethods?.reduce((acc, method) => {
    const type = method.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(method);
    return acc;
  }, {} as Record<string, SubscriptionPaymentMethod[]>) || {};

  const getMethodIcon = (gateway: PaymentGateway) => {
    switch (gateway) {
      case PaymentGateway.STRIPE:
        return '💳';
      case PaymentGateway.PAYPAL:
        return '🔵';
      case PaymentGateway.GOOGLE_PAY:
        return 'G';
      case PaymentGateway.APPLE_PAY:
        return '🍎';
      case PaymentGateway.BKASH:
        return '📱';
      case PaymentGateway.NAGAD:
        return '📱';
      case PaymentGateway.ROCKET:
        return '📱';
      case PaymentGateway.UPAY:
        return '📱';
      default:
        return '💳';
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log('🔵 PaymentMethodSelector opened', { paymentMethods, defaultMethod, selectedMethod });
    }
  }, [isOpen, paymentMethods, defaultMethod, selectedMethod]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Payment Method" size="lg">
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Amount: <span className="font-semibold text-lg">{currency} {amount.toFixed(2)}</span>
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading payment methods...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Worldwide Payment Methods */}
            {groupedMethods['card'] && groupedMethods['card'].length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Credit/Debit Cards
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {groupedMethods['card'].map((method) => (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all ${
                        selectedMethod?.id === method.id
                          ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleSelect(method)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{getMethodIcon(method.gateway)}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{method.displayName || method.name}</p>
                                {method.isDefault && (
                                  <Badge variant="info" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              {method.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {method.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {selectedMethod?.id === method.id && (
                            <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Digital Wallets */}
            {groupedMethods['digital_wallet'] && groupedMethods['digital_wallet'].length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Digital Wallets
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {groupedMethods['digital_wallet'].map((method) => (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all ${
                        selectedMethod?.id === method.id
                          ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleSelect(method)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{getMethodIcon(method.gateway)}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{method.displayName || method.name}</p>
                                {method.isDefault && (
                                  <Badge variant="info" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              {method.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {method.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {selectedMethod?.id === method.id && (
                            <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Wallets (Bangladesh) */}
            {groupedMethods['mobile_wallet'] && groupedMethods['mobile_wallet'].length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Mobile Wallets (Bangladesh)
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {groupedMethods['mobile_wallet'].map((method) => (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all ${
                        selectedMethod?.id === method.id
                          ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => handleSelect(method)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{getMethodIcon(method.gateway)}</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{method.displayName || method.name}</p>
                                {method.isDefault && (
                                  <Badge variant="info" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                              {method.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {method.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {selectedMethod?.id === method.id && (
                            <CheckCircleIcon className="h-5 w-5 text-primary-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedMethod}
            className="flex-1"
          >
            Continue with {selectedMethod?.displayName || selectedMethod?.name || 'Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

