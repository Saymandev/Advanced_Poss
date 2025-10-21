export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  WAITER = 'waiter',
  KITCHEN = 'kitchen',
  BARISTA = 'barista',
  BARTENDER = 'bartender',
  HOST = 'host',
  CLEANER = 'cleaner',
  DELIVERY = 'delivery',
  CUSTOMER = 'customer',
  OWNER = 'owner',
  CHEF = 'chef'
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.CASHIER]: 'Cashier',
  [UserRole.WAITER]: 'Waiter',
  [UserRole.KITCHEN]: 'Kitchen Staff',
  [UserRole.BARISTA]: 'Barista',
  [UserRole.BARTENDER]: 'Bartender',
  [UserRole.HOST]: 'Host',
  [UserRole.CLEANER]: 'Cleaner',
  [UserRole.DELIVERY]: 'Delivery',
  [UserRole.CUSTOMER]: 'Customer',
  [UserRole.OWNER]: 'Owner',
  [UserRole.CHEF]: 'Chef'
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Full system access and control',
  [UserRole.ADMIN]: 'Branch management and user administration',
  [UserRole.MANAGER]: 'Branch operations and staff management',
  [UserRole.CASHIER]: 'Point of sale and payment processing',
  [UserRole.WAITER]: 'Table service and order taking',
  [UserRole.KITCHEN]: 'Food preparation and kitchen operations',
  [UserRole.BARISTA]: 'Coffee and beverage preparation',
  [UserRole.BARTENDER]: 'Alcoholic beverage preparation and service',
  [UserRole.HOST]: 'Customer seating and reservations',
  [UserRole.CLEANER]: 'Cleaning and maintenance',
  [UserRole.DELIVERY]: 'Order delivery and logistics',
  [UserRole.CUSTOMER]: 'Customer access and ordering',
  [UserRole.OWNER]: 'Business ownership and management',
  [UserRole.CHEF]: 'Head chef and kitchen management'
};
