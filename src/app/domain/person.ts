export interface Person {
  _id: string;
  name: string;
  position: string;
  phone: string;
  clientName?: string;
  sendingList?: string[];
  email: string;
  coordinatorUid?: string;
  isActive?: boolean;
  clientType?: 'private' | 'business';
}
