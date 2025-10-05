export enum PaymentType {
  MONITOR = 'monitor',
  WASH = 'wash',
  TECH = 'tech',
}

export enum PaymentStatus {
  HOLD = 0,
  CHARGE_PENDING = 1,
  PAYMENT_PENDING = 2,
  PAYED = 3,
}

export interface AnyPayment {
  id?: string;
  type: PaymentType;
  clientId?: string;
  price: number;
  status: PaymentStatus;
  billDate?: number;
  invoice?: string;
  invoiceDate?: number;
}


