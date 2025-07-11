import { GoogleMapsPosition } from './coords';

export interface SystemLocation extends Partial<GoogleMapsPosition> {
  region?: string[];
  relatedSystems?: string[];
}

export enum Regions {
  GOLAN_NORTH = 'GOLAN_NORTH',
  GOLAN_SOUTH = 'GOLAN_SOUTH',
  RAMIM_MT = 'RAMIM_MT',
  GALIL_UPPER = 'GALIL-UPPER',
  GALIL_LOWER = 'GALIL_LOWER',
  GALIL_WEST = 'GALIL-WEST',
  GALIL_VALLEYS = 'GALIL_VALLEYS',
  VALLEYS = 'VALLEYS',
  SHARON = 'SHARON',
  CENTER = 'CENTER',
  JERUSALEM = 'JERUSALEM',
  LACHISH = 'LACHISH',
  SOUTH = 'SOUTH',
}

export const RegionsDictionary: Dictionary = {
  [Regions.JERUSALEM]: 'ירושלים',
  [Regions.CENTER]: 'מרכז',
  [Regions.RAMIM_MT]: 'רכס רמים',
  [Regions.GOLAN_NORTH]: 'רמת הגולן - צפון',
  [Regions.GOLAN_SOUTH]: 'רמת הגולן - דרום',
  [Regions.SOUTH]: 'דרום',
  [Regions.GALIL_VALLEYS]: 'גליל תחתון - עמקים',
  [Regions.GALIL_UPPER]: 'גליל עליון',
  [Regions.GALIL_LOWER]: 'גליל תחתון',
  [Regions.GALIL_WEST]: 'גליל מערבי',
  [Regions.VALLEYS]: 'עמקים',
  [Regions.LACHISH]: 'לכיש',
  [Regions.SHARON]: 'שרון',
};
