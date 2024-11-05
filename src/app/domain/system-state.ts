export interface SystemState {
  notes: boolean;
  actions: string;
  openAlerts: number;
  clearedAlerts: number;
  startOfYear: number;
  startOfMonth: number;
  lastMonth: number;
  today: number;
  monthly: number;
  weekly: number;
  threeDays: number;
  yesterday: number;
  communication: boolean;
  portal: string;
  kWp: number;
  systemName: string;
  tested: boolean;
}
