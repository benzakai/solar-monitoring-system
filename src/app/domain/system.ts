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
  location?: {
    relatedSystems?: string[];
  };
  client?: {
    name: string;
    id: string;
  };
  lastConnectionTime?: string;
  comments: string | null;
  contactsIds: string[];
}
