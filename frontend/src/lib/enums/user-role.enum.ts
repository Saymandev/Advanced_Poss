export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  CHEF = 'chef',
  COOK = 'cook',
  WAITER = 'waiter',
  CASHIER = 'cashier',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.OWNER]: 'Owner',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.CHEF]: 'Chef',
  [UserRole.COOK]: 'Cook',
  [UserRole.WAITER]: 'Waiter',
  [UserRole.CASHIER]: 'Cashier',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Full system access and control',
  [UserRole.OWNER]: 'Business ownership and management',
  [UserRole.MANAGER]: 'Branch operations and staff management',
  [UserRole.CHEF]: 'Head chef and kitchen management',
  [UserRole.COOK]: 'Food preparation and kitchen operations',
  [UserRole.WAITER]: 'Table service and order taking',
  [UserRole.CASHIER]: 'Point of sale and payment processing',
};
