export enum Regions {
  Dan = 'Gush Dan',
  North = 'North',
  South = 'South',
  Center = 'Center',
  Jerusalem = 'Jerusalem',
  Yehuda = 'Yehuda',
}

export const RegionsDictionary: Record<string, string> = {
  [Regions.Dan]: 'גוש דן',
  [Regions.North]: 'צפון',
  [Regions.South]: 'דרום',
  [Regions.Center]: 'מרכז',
  [Regions.Jerusalem]: 'ירושלים',
  [Regions.Yehuda]: 'יהודה ושומרון',
}; 