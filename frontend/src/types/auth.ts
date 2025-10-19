export interface BranchAddress {
  street: string;
  city?: string;
  state?: string;
  country: string;
  zipCode?: string;
}

export interface CompanyOwnerRegisterData {
  companyName: string;
  companyType: 'restaurant' | 'cafe' | 'bar';
  country: string;
  companyEmail: string;
  branchName: string;
  branchAddress: BranchAddress;
  package: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  pin: string;
}

export interface LoginFlowData {
  companyId: string;
  branchId: string;
  role: string;
  pin: string;
}
