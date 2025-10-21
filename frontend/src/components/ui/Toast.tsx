import { cn } from '@/lib/utils';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { ReactNode } from 'react';

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
}

const typeConfig = {
  success: {
    icon: CheckCircleIcon,
    iconColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  error: {
    icon: XCircleIcon,
    iconColor: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
};

export function Toast({ type, title, message, action, onClose, className }: ToastProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'max-w-sm w-full border rounded-lg shadow-lg pointer-events-auto',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={cn('h-5 w-5', config.iconColor)} />
          </div>
          <div className="ml-3 w-0 flex-1">
            {title && (
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {title}
              </p>
            )}
            <p className={cn(
              'text-sm',
              title ? 'mt-1' : '',
              type === 'success' ? 'text-green-800 dark:text-green-200' :
              type === 'error' ? 'text-red-800 dark:text-red-200' :
              type === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
              'text-blue-800 dark:text-blue-200'
            )}>
              {message}
            </p>
            {action && (
              <div className="mt-2">
                {action}
              </div>
            )}
          </div>
          {onClose && (
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={onClose}
                className="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  children: ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ children, position = 'top-right' }: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  return (
    <div
      className={cn(
        'fixed z-50 space-y-2',
        positionClasses[position]
      )}
    >
      {children}
    </div>
  );
}
