'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useSubmitPaymentRequestMutation } from '@/lib/api/endpoints/subscriptionPaymentsApi';
import { useUploadMenuImagesMutation } from '@/lib/api/endpoints/menuItemsApi';
import { CheckCircleIcon, ClipboardDocumentIcon, ExclamationTriangleIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRef, useState } from 'react';
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
  // Additional props for payment submission
  companyId?: string;
  paymentMethodId?: string;
  planName?: string;
  billingCycle?: string;
}

export function PaymentInstructionsModal({
  isOpen,
  onClose,
  instructions,
  gateway,
  onPaymentCompleted,
  companyId,
  paymentMethodId,
  planName,
  billingCycle = 'monthly',
}: PaymentInstructionsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    transactionId: '',
    phoneNumber: '',
    referenceNumber: '',
    notes: '',
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [submitPaymentRequest, { isLoading: isSubmitting }] = useSubmitPaymentRequestMutation();
  const [uploadImage, { isLoading: isUploadingScreenshot }] = useUploadMenuImagesMutation();

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

        {!showPaymentForm ? (
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              I'll Pay Later
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                // Always show the form when user clicks "I've Completed Payment"
                setShowPaymentForm(true);
              }}
              className="flex-1"
            >
              I've Completed Payment
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Submit Payment Details
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Please provide the transaction details from your payment:
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction ID <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Enter transaction ID from {gatewayName}"
                  value={paymentForm.transactionId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The transaction ID you received after completing the payment
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number Used for Payment <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={paymentForm.phoneNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, phoneNumber: e.target.value })}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  The phone number you used to make the payment
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reference Number (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="Enter reference number if available"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                  placeholder="Any additional information about your payment..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Screenshot (Optional)
                </label>
                <div className="space-y-2">
                  {screenshotPreview && (
                    <div className="relative inline-block">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="w-full max-w-xs h-auto rounded-lg border border-gray-300 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotFile(null);
                          setScreenshotPreview(null);
                          if (screenshotInputRef.current) {
                            screenshotInputRef.current.value = '';
                          }
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // Validate file type
                      if (!file.type.startsWith('image/')) {
                        toast.error('Please select an image file');
                        return;
                      }

                      // Validate file size (5MB)
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('Image size must be less than 5MB');
                        return;
                      }

                      setScreenshotFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setScreenshotPreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <PhotoIcon className="w-5 h-5" />
                    {screenshotPreview ? 'Change Screenshot' : 'Upload Payment Screenshot'}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Upload a screenshot of your payment confirmation (JPEG, PNG, GIF, WebP - Max 5MB)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPaymentForm(false);
                  setPaymentForm({ transactionId: '', phoneNumber: '', referenceNumber: '', notes: '' });
                  setScreenshotFile(null);
                  setScreenshotPreview(null);
                  if (screenshotInputRef.current) {
                    screenshotInputRef.current.value = '';
                  }
                }}
                className="flex-1"
                disabled={isSubmitting || isUploadingScreenshot}
              >
                Back
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!paymentForm.transactionId || !paymentForm.phoneNumber) {
                    toast.error('Please fill in all required fields');
                    return;
                  }

                  // Try to get payment info from props first, then from instructions metadata
                  const effectiveCompanyId = companyId || (instructions as any)?._paymentInfo?.companyId;
                  const effectivePaymentMethodId = paymentMethodId || (instructions as any)?._paymentInfo?.paymentMethodId;
                  const effectivePlanName = planName || (instructions as any)?._paymentInfo?.planName;
                  const effectiveBillingCycle = billingCycle || (instructions as any)?._paymentInfo?.billingCycle || 'monthly';

                  if (!effectiveCompanyId || !effectivePaymentMethodId || !effectivePlanName) {
                    console.error('Missing payment information:', {
                      companyId: effectiveCompanyId,
                      paymentMethodId: effectivePaymentMethodId,
                      planName: effectivePlanName,
                      props: { companyId, paymentMethodId, planName },
                      instructions: (instructions as any)?._paymentInfo,
                    });
                    toast.error('Missing payment information. Please close and try again from the beginning.');
                    return;
                  }

                  try {
                    // Upload screenshot if provided
                    let screenshotUrl: string | undefined;
                    if (screenshotFile) {
                      toast.loading('Uploading screenshot...', { id: 'screenshot-upload' });
                      try {
                        const formData = new FormData();
                        formData.append('images', screenshotFile);
                        const uploadResult = await uploadImage(formData).unwrap();
                        if (uploadResult.success && uploadResult.images && uploadResult.images.length > 0) {
                          screenshotUrl = uploadResult.images[0].url;
                          toast.success('Screenshot uploaded successfully', { id: 'screenshot-upload' });
                        } else {
                          toast.error('Failed to upload screenshot', { id: 'screenshot-upload' });
                        }
                      } catch (uploadError: any) {
                        toast.error(uploadError?.data?.message || 'Failed to upload screenshot', { id: 'screenshot-upload' });
                        return;
                      }
                    }

                    toast.loading('Submitting payment details...', { id: 'payment-submit' });
                    await submitPaymentRequest({
                      companyId: effectiveCompanyId,
                      paymentMethodId: effectivePaymentMethodId,
                      planName: effectivePlanName,
                      amount: instructions.amount,
                      currency: instructions.currency,
                      billingCycle: effectiveBillingCycle,
                      transactionId: paymentForm.transactionId,
                      phoneNumber: paymentForm.phoneNumber,
                      referenceNumber: paymentForm.referenceNumber || undefined,
                      notes: paymentForm.notes || undefined,
                      screenshotUrl,
                    }).unwrap();

                    toast.dismiss('payment-submit');
                    toast.success('Payment details submitted successfully! Our team will verify and activate your subscription within 24 hours.');
                    
                    if (onPaymentCompleted) {
                      onPaymentCompleted();
                    }
                    
                    setShowPaymentForm(false);
                    setPaymentForm({ transactionId: '', phoneNumber: '', referenceNumber: '', notes: '' });
                    setScreenshotFile(null);
                    setScreenshotPreview(null);
                    if (screenshotInputRef.current) {
                      screenshotInputRef.current.value = '';
                    }
                    onClose();
                  } catch (error: any) {
                    toast.dismiss('payment-submit');
                    toast.error(error?.data?.message || error?.message || 'Failed to submit payment details');
                  }
                }}
                className="flex-1"
                disabled={isSubmitting || isUploadingScreenshot}
              >
                {isSubmitting || isUploadingScreenshot ? 'Submitting...' : 'Submit Payment Details'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

