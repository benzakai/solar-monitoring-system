import { IdName } from './id-name';

export interface MonitorItem {
  id: string;
  communication: string;
  today_average: number;
  since_year_average: number;
  since_month_average: number;
  weekly_comparable: number;
  monthly_comparable: number;
  portal: string;
  system_name: string;
  today_comparable: number;
  last_month_average: number;
  three_days_comparable: number;
  yesterday_comparable: number;
  system_active: boolean;
  region: string[];
  alerts_from_portal: {
    quantity: number;
    highestImpact: string;
  };
  kwp: number;
  comments: string;
  close_issues: number;
  open_issues: number;
  client: IdName;
  monthly_percent: number;
  three_days_percent: number;
  today_percent: number;
  weekly_percent: number;
  yesterday_percent: number;
}
