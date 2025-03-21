export type EnergySample = {
  time: number;
  valueKwh: number;
  apiValue?: number;
  h?: number;
};

export type Energy = {
  id: string;
  annual: EnergySample[];
  daily: EnergySample[];
  multiAnnual: EnergySample[];
  '#modified': number;
};

export type EnergyApiRecord = EnergySample & {
  apiValue?: number;
};
