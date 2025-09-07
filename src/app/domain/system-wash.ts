export type Wash = {
  date: number;
  price: number;
  done: boolean;
  comment?: string;
  nextWash?: number;
  supplier?: string;
  washDone?: boolean;
};

export type SystemWash = {
  id: string;
  washes: Wash[];
};
