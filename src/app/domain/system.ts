export interface System {
  id: string;
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
}
