'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAppSelector } from '@/lib/store';
import { ClipboardIcon, ComputerDesktopIcon, LinkIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function CustomerDisplayPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [displayUrl, setDisplayUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  useEffect(() => {
    if (branchId && typeof window !== 'undefined') {
      const url = `${window.location.origin}/display/orders?branchId=${branchId}`;
      setDisplayUrl(url);
    }
  }, [branchId]);

  const copyToClipboard = () => {
    if (displayUrl) {
      navigator.clipboard.writeText(displayUrl);
      setCopied(true);
      toast.success('Display URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openDisplay = () => {
    if (displayUrl) {
      window.open(displayUrl, '_blank');
    }
  };

  if (!branchId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <ComputerDesktopIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">No Branch Selected</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please select a branch to view the customer display URL.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Customer Display System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Display order items on a public screen for customers to see what's being prepared.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Display URL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              Display URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Customer Display URL:</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {displayUrl || 'Generating...'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                variant="secondary"
                className="flex-1"
              >
                <ClipboardIcon className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
              <Button
                onClick={openDisplay}
                variant="primary"
                className="flex-1"
              >
                <ComputerDesktopIcon className="w-4 h-4 mr-2" />
                Open Display
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCodeIcon className="w-5 h-5" />
              QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {displayUrl ? (
                <QRCodeSVG
                  value={displayUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              ) : (
                <div className="w-[200px] h-[200px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <p className="text-gray-400">Loading...</p>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Scan this QR code to open the customer display on a tablet or TV
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Display Setup</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>Open the display URL on a tablet, TV, or monitor</li>
                <li>Use a browser in fullscreen/kiosk mode</li>
                <li>Position the display where customers can see it</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Features</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>Real-time order updates via WebSocket</li>
                <li>Grid layout showing individual order items</li>
                <li>Status badges: PENDING, PREPARING, READY</li>
                <li>Elapsed time for each order</li>
                <li>Urgent order indicators</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Best Practices</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                <li>Keep the display visible to customers</li>
                <li>Use a dedicated device for the display</li>
                <li>Ensure stable internet connection</li>
                <li>Test the display before peak hours</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

