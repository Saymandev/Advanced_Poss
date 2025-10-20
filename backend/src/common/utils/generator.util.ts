import { v4 as uuidv4 } from 'uuid';

export class GeneratorUtil {
  static generateOrderNumber(prefix: string = 'ORD'): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `${prefix}-${year}${month}${day}-${random}`;
  }

  static generateBranchCode(companyName: string): string {
    const prefix = companyName
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `${prefix}${random}`;
  }

  static generateEmployeeId(branchCode: string): string {
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `EMP-${branchCode}-${random}`;
  }

  static generateSKU(category: string): string {
    const prefix = category.substring(0, 3).toUpperCase();
    const uuid = uuidv4().split('-')[0].toUpperCase();
    return `${prefix}-${uuid}`;
  }

  static generateInvoiceNumber(prefix: string = 'INV'): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');

    return `${prefix}-${year}${month}-${random}`;
  }

  static generateId(): string {
    return uuidv4();
  }

  static generatePin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static generateToken(length: number = 32): string {
    return uuidv4().replace(/-/g, '').substring(0, length);
  }
}

