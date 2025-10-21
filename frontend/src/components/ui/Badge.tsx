import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  secondary: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-3 py-2 text-base',
};

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  className 
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'available':
      case 'completed':
      case 'paid':
      case 'confirmed':
        return 'success';
      case 'pending':
      case 'processing':
      case 'waiting':
        return 'warning';
      case 'inactive':
      case 'unavailable':
      case 'cancelled':
      case 'failed':
      case 'rejected':
        return 'danger';
      case 'draft':
      case 'scheduled':
      case 'reserved':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Badge variant={getStatusVariant(status)} className={className}>
      {status}
    </Badge>
  );
}

interface RoleBadgeProps {
  role: string;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const getRoleVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
      case 'super_admin':
        return 'danger';
      case 'manager':
        return 'info';
      case 'chef':
        return 'warning';
      case 'waiter':
      case 'cashier':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Badge variant={getRoleVariant(role)} className={className}>
      {role.replace('_', ' ').toUpperCase()}
    </Badge>
  );
}
