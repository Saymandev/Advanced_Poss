'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CheckCircleIcon, ClipboardDocumentIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface PaymentInstructions {
  phoneNumber: string;
  amount: number;
  currency: string;
  reference: string;
  message?: string;
  error?: string;
}

interface PaymentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructions: PaymentInstructions;
  gateway: string;
  onPaymentCompleted?: () => void;
}

export function PaymentInstructionsModal({
  isOpen,
  onClose,
  instructions,
  gateway,
  onPaymentCompleted,
}: PaymentInstructionsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getGatewayName = (gateway: string) => {
    const gatewayLower = gateway.toLowerCase();
    if (gatewayLower.includes('bkash') || gatewayLower === 'bkash') return 'bKash';
    if (gatewayLower.includes('nagad') || gatewayLower === 'nagad') return 'Nagad';
    if (gatewayLower.includes('rocket') || gatewayLower === 'rocket') return 'Rocket';
    if (gatewayLower.includes('upay') || gatewayLower === 'upay') return 'Upay';
    return gateway;
  };

  const gatewayName = getGatewayName(gateway);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${gatewayName} Payment Instructions`} size="lg">
      <div className="space-y-6">
        {instructions.error && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Payment Gateway Unavailable
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  {instructions.error}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                  Please complete the payment manually using the instructions below.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Important:</strong> Please complete the payment and keep the transaction reference number. 
            Our support team will verify your payment and activate your subscription within 24 hours.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Send Payment To:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {instructions.phoneNumber}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(instructions.phoneNumber, 'phone')}
                className="flex items-center gap-2"
              >
                {copiedField === 'phone' ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Amount to Send:
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(instructions.amount, instructions.currency)}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Transaction Reference Number:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                  {instructions.reference}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(instructions.reference, 'reference')}
                className="flex items-center gap-2"
              >
                {copiedField === 'reference' ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Include this reference number when sending the payment
            </p>
          </div>

          {instructions.message && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {instructions.message}
              </p>
            </div>
          )}

          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  After Payment:
                </p>
                <ul className="text-sm text-green-700 dark:text-green-400 mt-1 space-y-1 list-disc list-inside">
                  <li>Save the transaction reference number</li>
                  <li>Contact our support team with the reference number</li>
                  <li>Your subscription will be activated within 24 hours</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            I'll Pay Later
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (onPaymentCompleted) {
                onPaymentCompleted();
              }
              onClose();
            }}
            className="flex-1"
          >
            I've Completed Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
}

