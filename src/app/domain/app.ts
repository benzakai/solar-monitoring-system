import { Tarifs } from './tarifs';

export type App = {
  prediction: AppPrediction;
  TaarifConstants: Tarifs;
};

export type AppPrediction = {
  AGE_FACTOR: number;
  AUTO_WASH_FACTOR: number;
  AZIMUTH_FACTOR: number;
  DEFAULT_ANNUAL: number;
  MONTH_DIST_NORMAL: number[];
  MONTH_DIST_TAOZ: number[];
  TRACKER_FACTOR: number;
};
