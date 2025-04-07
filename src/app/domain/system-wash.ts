export type Wash = {
  date: number;
  price: number;
  done: boolean;
  comment?: string;
  nextWash?: number;
  supplier?: string;
};

export type SystemWash = {
  id: string;
  washes: Wash[];
};
