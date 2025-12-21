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
      <div className="p-4 sm:p-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <ComputerDesktopIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-400" />
              <h2 className="text-lg sm:text-xl font-semibold mb-2">No Branch Selected</h2>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Please select a branch to view the customer display URL.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Customer Display System
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Display order items on a public screen for customers to see what's being prepared.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Display URL Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Display URL</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">Customer Display URL:</p>
              <p className="text-xs sm:text-sm font-mono text-gray-900 dark:text-white break-all">
                {displayUrl || 'Generating...'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={copyToClipboard}
                variant="secondary"
                className="flex-1 text-sm sm:text-base"
              >
                <ClipboardIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
              <Button
                onClick={openDisplay}
                variant="primary"
                className="flex-1 text-sm sm:text-base"
              >
                <ComputerDesktopIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Open Display
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <QrCodeIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>QR Code</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {displayUrl ? (
                <QRCodeSVG
                  value={displayUrl}
                  size={Math.min(200, typeof window !== 'undefined' ? window.innerWidth * 0.4 : 200)}
                  level="H"
                  includeMargin={true}
                  className="max-w-full h-auto"
                />
              ) : (
                <div className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <p className="text-xs sm:text-sm text-gray-400">Loading...</p>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center">
              Scan this QR code to open the customer display on a tablet or TV
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="font-semibold text-sm sm:text-base mb-2">1. Display Setup</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <li>Open the display URL on a tablet, TV, or monitor</li>
                <li>Use a browser in fullscreen/kiosk mode</li>
                <li>Position the display where customers can see it</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base mb-2">2. Features</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <li>Real-time order updates via WebSocket</li>
                <li>Grid layout showing individual order items</li>
                <li>Status badges: PENDING, PREPARING, READY</li>
                <li>Elapsed time for each order</li>
                <li>Urgent order indicators</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base mb-2">3. Best Practices</h3>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
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

