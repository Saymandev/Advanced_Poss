'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useRolePermissions } from '@/hooks/useRolePermissions';
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
    ComputerDesktopIcon,
    CurrencyDollarIcon,
    DocumentTextIcon,
    GiftIcon,
    HomeIcon,
    PhotoIcon,
    PrinterIcon,
    ReceiptPercentIcon,
    ShieldCheckIcon,
    ShoppingBagIcon,
    SparklesIcon,
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
import { useMemo, useState } from 'react';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  children?: NavigationItem[];
  roles?: string[];
  requiredFeature?: string | string[]; // Feature ID(s) required to show this menu item
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    requiredFeature: 'dashboard',
    // Hide the regular owner dashboard entry for super admins,
    // they have a dedicated "Super Admin Dashboard" menu instead.
    roles: ['owner', 'manager', 'chef', 'waiter', 'cashier'],
  },
  {
    name: 'POS System',
    href: '/dashboard/pos',
    icon: ShoppingBagIcon,
    requiredFeature: 'order-management',
    children: [
      {
        name: 'POS Terminal',
        href: '/dashboard/pos',
        icon: ShoppingBagIcon,
        requiredFeature: 'order-management',
      },
      {
        name: 'POS Settings',
        href: '/dashboard/pos-settings',
        icon: CogIcon,
        requiredFeature: 'order-management',
      },
      {
        name: 'Printer Management',
        href: '/dashboard/printer-management',
        icon: PrinterIcon,
        requiredFeature: 'order-management',
      },
    ],
  },
  {
    name: 'Order History',
    href: '/dashboard/order-history',
    icon: ClockIcon,
    requiredFeature: 'order-management',
  },
  {
    name: 'Deliveries',
    href: '/dashboard/deliveries',
    icon: TruckIcon,
    requiredFeature: 'delivery-management',
  },
  {
    name: 'Menu',
    href: '/dashboard/menu-items',
    icon: ShoppingBagIcon,
    requiredFeature: ['menu-management', 'categories'], // Show if user has ANY of these
    children: [
      {
        name: 'Menu Items',
        href: '/dashboard/menu-items',
        icon: ShoppingBagIcon,
        requiredFeature: 'menu-management',
      },
      {
        name: 'Categories',
        href: '/dashboard/categories',
        icon: TagIcon,
        requiredFeature: 'categories',
      },
    ],
  },
  {
    name: 'Tables',
    href: '/dashboard/tables',
    icon: TableCellsIcon,
    requiredFeature: 'table-management',
  },
  {
    name: 'Kitchen',
    href: '/dashboard/kitchen',
    icon: BeakerIcon,
    requiredFeature: 'kitchen-display',
  },
  {
    name: 'Customer Display',
    href: '/dashboard/customer-display',
    icon: ComputerDesktopIcon,
    requiredFeature: 'order-management',
  },
  {
    name: 'Customers',
    href: '/dashboard/customers',
    icon: UserGroupIcon,
    requiredFeature: 'customer-management',
  },
  {
    name: 'Staff',
    href: '/dashboard/staff',
    icon: UsersIcon,
    requiredFeature: 'staff-management',
  },
  {
    name: 'Attendance',
    href: '/dashboard/attendance',
    icon: ClockIcon,
    requiredFeature: 'attendance',
  },
  {
    name: 'Inventory',
    href: '/dashboard/ingredients',
    icon: ClipboardDocumentListIcon,
    requiredFeature: ['inventory', 'suppliers', 'purchase-orders'], // Show if user has ANY
    children: [
      {
        name: 'Ingredients',
        href: '/dashboard/ingredients',
        icon: BeakerIcon,
        requiredFeature: 'inventory',
      },
      {
        name: 'Stocks',
        href: '/dashboard/stocks',
        icon: ClipboardDocumentListIcon,
        requiredFeature: 'inventory',
      },
      {
        name: 'Suppliers',
        href: '/dashboard/suppliers',
        icon: TruckIcon,
        requiredFeature: 'suppliers',
      },
      {
        name: 'Purchase Orders',
        href: '/dashboard/purchase-orders',
        icon: ShoppingBagIcon,
        requiredFeature: 'purchase-orders',
      },
    ],
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: ChartBarIcon,
    requiredFeature: 'reports',
  },
  {
    name: 'Financial',
    href: '/dashboard/expenses',
    icon: CurrencyDollarIcon,
    requiredFeature: ['expenses', 'work-periods'], // Show if user has ANY
    children: [
      {
        name: 'Expenses',
        href: '/dashboard/expenses',
        icon: CurrencyDollarIcon,
        requiredFeature: 'expenses',
      },
      {
        name: 'Work Periods',
        href: '/dashboard/work-periods',
        icon: ClockIcon,
        requiredFeature: 'work-periods',
      },
    ],
  },
  {
    name: 'Digital Services',
    href: '/dashboard/digital-receipts',
    icon: ReceiptPercentIcon,
    requiredFeature: 'order-management',
    children: [
      {
        name: 'Digital Receipts',
        href: '/dashboard/digital-receipts',
        icon: ReceiptPercentIcon,
        requiredFeature: 'order-management',
      },
      {
        name: 'QR Menus',
        href: '/dashboard/qr-code-menus',
        icon: TableCellsIcon,
        requiredFeature: 'menu-management',
      },
    ],
  },
  {
    name: 'AI Features',
    href: '/dashboard/ai-menu-optimization',
    icon: ChartBarIcon,
    requiredFeature: ['ai-menu-optimization', 'ai-customer-loyalty'], // Show if user has ANY AI feature
    children: [
      {
        name: 'Menu Optimization',
        href: '/dashboard/ai-menu-optimization',
        icon: ChartBarIcon,
        requiredFeature: 'ai-menu-optimization', // Must match backend guard
      },
      {
        name: 'Customer Loyalty AI',
        href: '/dashboard/customer-loyalty-ai',
        icon: UserGroupIcon,
        requiredFeature: 'ai-customer-loyalty', // Must match backend guard and route map
      },
    ],
  },
  {
    name: 'Marketing',
    href: '/dashboard/marketing',
    icon: GiftIcon,
    requiredFeature: 'marketing', // Only show for plans that include marketing feature
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: CogIcon,
    requiredFeature: ['settings', 'branches', 'role-management'], // Show if user has ANY
    children: [
      {
        name: 'General',
        href: '/dashboard/settings',
        icon: CogIcon,
        requiredFeature: 'settings',
      },
      {
        name: 'Branches',
        href: '/dashboard/branches',
        icon: BuildingOfficeIcon,
        requiredFeature: 'branches',
      },
      {
        name: 'Role Access',
        href: '/dashboard/role-access',
        icon: UserCircleIcon,
        requiredFeature: 'role-management',
      },
      {
        name: 'Subscriptions',
        href: '/dashboard/subscriptions',
        icon: ReceiptPercentIcon,
        requiredFeature: 'settings', // Usually only owner has this
      },
      {
        name: 'Gallery',
        href: '/dashboard/gallery',
        icon: PhotoIcon,
        requiredFeature: 'settings',
      },
    ],
  },
];

// Super Admin specific navigation items (shown only for super_admin role)
const superAdminNavigation: NavigationItem[] = [
  {
    name: 'Super Admin Dashboard',
    href: '/dashboard/super-admin',
    icon: ShieldCheckIcon,
    roles: ['super_admin'],
  },
  {
    name: 'Company Management',
    href: '/dashboard/companies',
    icon: BuildingOfficeIcon,
    roles: ['super_admin'],
  },
  {
    name: 'System Users',
    href: '/dashboard/users',
    icon: UsersIcon,
    roles: ['super_admin'],
  },
  {
    name: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: ReceiptPercentIcon,
    roles: ['super_admin'],
  },
  {
    name: 'Feature Catalog',
    href: '/dashboard/subscription-features',
    icon: SparklesIcon,
    roles: ['super_admin'],
  },
  {
    name: 'Company Features',
    href: '/dashboard/company-features',
    icon: ShieldCheckIcon,
    roles: ['super_admin'],
  },
  {
    name: 'System Settings',
    href: '/dashboard/system-settings',
    icon: CogIcon,
    roles: ['super_admin'],
  },
  {
    name: 'Content Management',
    href: '/dashboard/cms',
    icon: DocumentTextIcon,
    roles: ['super_admin'],
  },
  {
    name: 'Payment Methods',
    href: '/dashboard/subscription-payment-methods',
    icon: CurrencyDollarIcon,
    roles: ['super_admin'],
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user } = useAppSelector((state) => state.auth);
  const { hasAnyFeature, isLoading: permissionsLoading, permissions: userPermissions } = useRolePermissions();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Inventory', 'Financial', 'Settings']);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Combine navigation items - super admin items first, then regular items
  const allNavigationItems = useMemo(() => {
    const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';
    if (isSuperAdmin) {
      return [...superAdminNavigation, ...navigation];
    }
    return navigation;
  }, [user?.role]);

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
    // While permissions are loading, show menu items to avoid flickering
    // Once loaded, we'll filter properly
    if (permissionsLoading) {
      // During loading, only check role-based access if specified
      if (item.roles && item.roles.length > 0) {
        if (!user) return false;
        if (!item.roles.includes(user.role)) return false;
      }
      // If no role restriction and loading, show item temporarily
      return true;
    }

    // If permissions finished loading but userPermissions is null, 
    // it means no permissions were found for this role
    // In this case, only show items without requiredFeature (or dashboard as fallback)
    const permissionsLoaded = !permissionsLoading;
    const hasNoPermissions = permissionsLoaded && !userPermissions;
    
    // Check role-based access (legacy support)
    if (item.roles && item.roles.length > 0) {
      if (!user) return false;
      if (!item.roles.includes(user.role)) return false;
    }

    // Check feature-based access
    if (item.requiredFeature) {
      // If no permissions found and this item requires a feature, hide it
      if (hasNoPermissions) {
        // Exception: Always show dashboard even if no permissions
        if (item.href === '/dashboard') {
          return true;
        }
        return false;
      }
      
      const features = Array.isArray(item.requiredFeature) 
        ? item.requiredFeature 
        : [item.requiredFeature];
      
      // User needs at least ONE of the required features
      return hasAnyFeature(features);
    }

    // If no restrictions, allow access
    return true;
  };

  // Flatten navigation items for collapsed sidebar (show all children as flat items)
  const flattenNavigationItems = (items: NavigationItem[]): NavigationItem[] => {
    const flattened: NavigationItem[] = [];
    
    items.forEach((item) => {
      if (!hasAccess(item)) return;
      
      const hasChildren = item.children && item.children.length > 0;
      const accessibleChildren = hasChildren 
        ? item.children?.filter(child => hasAccess(child)) || []
        : [];
      
      // If parent has children, add all children as flat items (skip parent)
      if (hasChildren && accessibleChildren.length > 0) {
        flattened.push(...accessibleChildren);
      } else if (!hasChildren) {
        // If no children, add the parent item
        flattened.push(item);
      }
      // If parent has children but none accessible, skip it entirely
    });
    
    return flattened;
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    // Check if item itself has access
    if (!hasAccess(item)) return null;

    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    
    // Filter children based on feature access
    const accessibleChildren = hasChildren 
      ? item.children?.filter(child => hasAccess(child)) || []
      : [];
    
    // If parent has children but none are accessible, hide the parent too
    if (hasChildren && accessibleChildren.length === 0) {
      return null;
    }
    
    const isExpanded = expandedItems.includes(item.name);

    return (
      <div key={item.name}>
        <Link
          href={item.href}
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            active
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
            level > 0 && (isCollapsed ? 'ml-2' : 'ml-6'),
            level > 0 && !isCollapsed && 'border-l border-gray-200 dark:border-gray-700 pl-4',
            isCollapsed && 'justify-center px-2'
          )}
          onClick={(e) => {
            if (hasChildren && !isCollapsed) {
              e.preventDefault();
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
              className="ml-auto p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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

        {hasChildren && isExpanded && !isCollapsed && accessibleChildren.length > 0 && (
          <div className="mt-1.5 space-y-1.5 ml-2">
            {accessibleChildren.map((child) => renderNavigationItem(child, level + 1))}
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
          className="bg-white dark:bg-gray-800 shadow-lg p-2.5"
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
        'fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-all duration-300 ease-in-out flex flex-col ',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isCollapsed ? 'lg:w-16' : 'lg:w-64',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className={cn(
            "flex items-center gap-3 transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">Restaurant POS</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Management System</p>
            </div>
          </div>

          <div className="flex items-center">
            {/* Collapse toggle button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className="hidden lg:flex p-2"
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
              className="lg:hidden p-2"
            >
              <XMarkIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        

        {/* Navigation */}
        <nav className={cn(
          "flex-1 px-3 py-4 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent transition-all duration-300",
          isCollapsed ? "px-2" : ""
        )}>
          {isCollapsed 
            ? flattenNavigationItems(allNavigationItems).map((item: NavigationItem) => renderNavigationItem(item))
            : allNavigationItems.map((item: NavigationItem) => renderNavigationItem(item))
          }
        </nav>

        {/* Footer */}
        <div className={cn(
          "px-4 py-2 border-t border-gray-200 dark:border-gray-800 transition-all duration-300 shrink-0",
          isCollapsed ? "px-2" : ""
        )}>
          <div className={cn(
            "text-xs text-gray-600 dark:text-gray-400 text-center transition-all duration-300",
            isCollapsed ? "opacity-0 w-0 overflow-hidden h-0" : "opacity-100"
          )}>
            <p className="leading-tight">Advanced Restaurant POS</p>
            <p className="text-xs opacity-75">v1.0.0</p>
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