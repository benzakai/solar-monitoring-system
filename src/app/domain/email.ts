export type Email = {
  template: {
    name: string;
    data: {
      date: number;
    };
  };
  delivery: {
    endTime: number;
    startTime: number;
    state: string;
  };
  toUids: string[];
};
