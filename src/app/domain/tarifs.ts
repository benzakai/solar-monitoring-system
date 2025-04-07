export type Tarif = {
  between: number;
  summer: number;
  winter: number;
};

export type Tarifs = {
  highTaoz: Tarif;
  lowTaoz: Tarif;
};
