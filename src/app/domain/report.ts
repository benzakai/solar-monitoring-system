export type ReportData = {
  id: string;
  client: {
    id: string;
    name: string;
  };
  date: number;
  isAnnual: boolean;
  reportComment: string;
  startDate: number;
  systemId: string;
};
