import { SystemLocation } from './system-location';

export interface System {
  id: string;
  name: string;
  type?: string;
  KWP: number;
  AC: number;
  apiId: Array<string | number | null>;
  portalUrl: string | null;
  startTime: Date;
  annualPredictionPerMonth: number[];
  excludeFromAverage?: number;
  taoz: 'low' | 'high' | null;
  location: SystemLocation | null;
  client?: {
    name: string;
    id: string;
  };
  lastConnectionTime?: string;
  comments: string | null;
  contactsIds: string[];
  contract: string;

  power?: number;
  panelType?: string;
  numOfPanels?: number;
  communication?: string;
  installer?: string;
  monitorPriceKw?: number;
  azimuth?: number;
  tilt?: number;
  isTracker?: boolean;
  washControl?: boolean;
  autoWash?: boolean;
  washType?: string;
  washRate?: number;
  additionalContract?: string;
  contractStartTime?: any;
  annualCheckDate?: any;
  isActive?: boolean;
  annualPredictionPerMonth?: number;
  isPvsyst?: boolean;
}
