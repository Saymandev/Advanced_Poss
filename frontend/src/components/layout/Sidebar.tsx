'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAppSelector } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  Bars3Icon,
  BeakerIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CogIcon,
  CurrencyDollarIcon,
  GiftIcon,
  HomeIcon,
  PrinterIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  TagIcon,
  TruckIcon,
  UserCircleIcon,
  UserGroupIcon,
  UsersIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  children?: NavigationItem[];
  roles?: string[];
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'POS System',
    href: '/dashboard/pos',
    icon: ShoppingBagIcon,
    children: [
      {
        name: 'POS Terminal',
        href: '/dashboard/pos',
        icon: ShoppingBagIcon,
      },
      {
        name: 'POS Reports',
        href: '/dashboard/pos-reports',
        icon: ChartBarIcon,
      },
      {
        name: 'POS Settings',
        href: '/dashboard/pos-settings',
        icon: CogIcon,
      },
      {
        name: 'Printer Management',
        href: '/dashboard/printer-management',
        icon: PrinterIcon,
      },
    ],
  },
  {
    name: 'Orders',
    href: '/dashboard/order-history',
    icon: ClipboardDocumentListIcon,
    children: [
      {
        name: 'Order History',
        href: '/dashboard/order-history',
        icon: ClockIcon,
      },
    ],
  },
  {
    name: 'Menu',
    href: '/dashboard/menu-items',
    icon: ShoppingBagIcon,
    children: [
      {
        name: 'Menu Items',
        href: '/dashboard/menu-items',
        icon: ShoppingBagIcon,
      },
      {
        name: 'Categories',
        href: '/dashboard/categories',
        icon: TagIcon,
      },
    ],
  },
  {
    name: 'Tables',
    href: '/dashboard/tables',
    icon: TableCellsIcon,
  },
  {
    name: 'Kitchen',
    href: '/dashboard/kitchen',
    icon: BeakerIcon,
  },
  {
    name: 'Customers',
    href: '/dashboard/customers',
    icon: UserGroupIcon,
  },
  {
    name: 'Staff',
    href: '/dashboard/staff',
    icon: UsersIcon,
  },
  {
    name: 'Schedule',
    href: '/dashboard/schedule',
    icon: ClockIcon,
  },
  {
    name: 'Inventory',
    href: '/dashboard/ingredients',
    icon: ClipboardDocumentListIcon,
    children: [
      {
        name: 'Ingredients',
        href: '/dashboard/ingredients',
        icon: BeakerIcon,
      },
      {
        name: 'Stocks',
        href: '/dashboard/stocks',
        icon: ClipboardDocumentListIcon,
      },
      {
        name: 'Suppliers',
        href: '/dashboard/suppliers',
        icon: TruckIcon,
      },
      {
        name: 'Purchase Orders',
        href: '/dashboard/purchase-orders',
        icon: ShoppingBagIcon,
      },
    ],
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: ChartBarIcon,
  },
  {
    name: 'Financial',
    href: '/dashboard/expenses',
    icon: CurrencyDollarIcon,
    children: [
      {
        name: 'Expenses',
        href: '/dashboard/expenses',
        icon: CurrencyDollarIcon,
      },
      {
        name: 'Work Periods',
        href: '/dashboard/work-periods',
        icon: ClockIcon,
      },
    ],
  },
  {
    name: 'Digital Services',
    href: '/dashboard/digital-receipts',
    icon: ReceiptPercentIcon,
    children: [
      {
        name: 'Digital Receipts',
        href: '/dashboard/digital-receipts',
        icon: ReceiptPercentIcon,
      },
      {
        name: 'QR Menus',
        href: '/dashboard/qr-code-menus',
        icon: TableCellsIcon,
      },
    ],
  },
  {
    name: 'AI Features',
    href: '/dashboard/ai-menu-optimization',
    icon: ChartBarIcon,
    children: [
      {
        name: 'Menu Optimization',
        href: '/dashboard/ai-menu-optimization',
        icon: ChartBarIcon,
      },
      {
        name: 'Customer Loyalty AI',
        href: '/dashboard/customer-loyalty-ai',
        icon: UserGroupIcon,
      },
    ],
  },
  {
    name: 'Marketing',
    href: '/dashboard/marketing',
    icon: GiftIcon,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: CogIcon,
    children: [
      {
        name: 'General',
        href: '/dashboard/settings',
        icon: CogIcon,
      },
      {
        name: 'Branches',
        href: '/dashboard/branches',
        icon: BuildingOfficeIcon,
      },
      {
        name: 'Role Access',
        href: '/dashboard/role-access',
        icon: UserCircleIcon,
      },
      {
        name: 'Subscriptions',
        href: '/dashboard/subscriptions',
        icon: ReceiptPercentIcon,
      },
    ],
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user } = useAppSelector((state) => state.auth);
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Inventory', 'Financial', 'Settings']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const toggleCollapsed = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    // Dispatch custom event to notify layout
    window.dispatchEvent(new CustomEvent('sidebar-toggle', {
      detail: { collapsed: newCollapsed }
    }));
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const hasAccess = (item: NavigationItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    if (!hasAccess(item)) return null;

    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);

    return (
      <div key={item.name}>
        <Link
          href={item.href}
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            active
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
            level > 0 && (isCollapsed ? 'ml-2' : 'ml-6'),
            level > 0 && !isCollapsed && 'border-l border-gray-200 dark:border-gray-700 pl-4',
            isCollapsed && 'justify-center px-2'
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.name);
            }
            if (window.innerWidth < 768) {
              setIsMobileMenuOpen(false);
            }
          }}
          title={isCollapsed ? item.name : undefined}
        >
          <item.icon className={cn(
            'h-5 w-5 flex-shrink-0',
            active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
          )} />
          <span className={cn(
            "flex-1 transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>{item.name}</span>
          {item.badge && !isCollapsed && (
            <Badge variant="secondary" className="text-xs">
              {item.badge}
            </Badge>
          )}
          {hasChildren && !isCollapsed && (
            <button
              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={(e) => {
                e.preventDefault();
                toggleExpanded(item.name);
              }}
            >
              <Bars3Icon className={cn(
                'h-4 w-4 transition-transform',
                isExpanded ? 'rotate-90' : ''
              )} />
            </button>
          )}
        </Link>

        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(true)}
          className="bg-white dark:bg-gray-800 shadow-lg"
        >
          <Bars3Icon className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out flex flex-col',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isCollapsed ? 'lg:w-16' : 'lg:w-64',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className={cn(
            "flex items-center gap-3 transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Restaurant POS</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Collapse toggle button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className="hidden lg:flex"
            >
              <Bars3Icon className={cn(
                "h-5 w-5 transition-transform duration-300",
                isCollapsed ? "rotate-180" : ""
              )} />
            </Button>

            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden"
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className={cn(
            "p-4 border-b border-gray-200 dark:border-gray-800 transition-all duration-300",
            isCollapsed ? "px-2" : ""
          )}>
            <div className={cn(
              "flex items-center gap-3",
              isCollapsed ? "justify-center" : ""
            )}>
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <UserCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div className={cn(
                "flex-1 min-w-0 transition-all duration-300",
                isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn(
          "flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent transition-all duration-300",
          isCollapsed ? "px-2" : ""
        )} style={{ maxHeight: 'calc(100vh - 240px)' }}>
          {navigation.map((item) => renderNavigationItem(item))}
        </nav>

        {/* Footer */}
        <div className={cn(
          "p-4 border-t border-gray-200 dark:border-gray-800 transition-all duration-300",
          isCollapsed ? "px-2" : ""
        )}>
          <div className={cn(
            "text-xs text-gray-600 dark:text-gray-400 text-center transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            Advanced Restaurant POS
            <br />
            v1.0.0
          </div>
        </div>
      </div>

      {/* Mobile menu spacer */}
      <div className={cn(
        "flex-shrink-0 transition-all duration-300",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )} />
    </>
  );
}