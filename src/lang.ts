import {InjectionToken} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

export type Dictionary = Record<string, {
  [key in 'en' | 'he']: string;
}>;

export const LANGUAGE_DICTIONARY: InjectionToken<Dictionary> = new InjectionToken<Dictionary>('LANGUAGE_DICTIONARY');
export const LANGUAGE: InjectionToken<BehaviorSubject<'en' | 'he'>> = new InjectionToken<BehaviorSubject<'en' | 'he'>>('LANGUAGE');

export const language: Dictionary = {
  'all_clients': {
    en: 'All clients',
    he: 'כל הלקוחות'
  },
  'selected': {
    en: 'selected',
    he: 'נבחרו'
  },
  'search': {
    en: 'Search...',
    he: 'חיפוש...'
  },
  "all_regions": {
    en: 'All regions',
    he: 'כל האזורים'
  },
  'all_systems': {
    en: 'All Systems',
    he: 'כל המערכות'
  },
  'systems_appear_in_table': {
    en: 'Systems that appear in the table',
    he: 'מערכות שמופיעות בטבלה'
  },
  'were_checked_today': {
    en: 'Of which were checked today',
    he: 'מהן נבדקו היום'
  },
  'should_check_today': {
    en: 'Of which you should check today',
    he: 'מהן עליך לבדוק היום'
  },
  'read_data_from_server': {
    en: 'Time to read data from the server',
    he: 'זמן לקריאת נתונים מהשרת'
  },
  'notes': {
    en: 'Notes',
    he: 'הערות'
  },
  'actions': {
    en: 'Actions',
    he: 'פעולות'
  },
  'open_alerts': {
    en: 'Open Alerts',
    he: 'תקלות פתוחות'
  },
  'cleared_alerts': {
    en: 'Cleared Alerts',
    he: 'התראות מפורטל'
  },
  'start_of_year': {
    en: 'Start of Year',
    he: 'מתחילת השנה'
  },
  'index_relative': {
    en: 'Index relative to expectations',
    he: 'מדד ביחס לצפי'
  },
  'start_of_month': {
    en: 'Start of Month',
    he: 'מתחילת החודש'
  },
  'last_month': {
    en: 'Last Month',
    he: 'חודש אחרון'
  },
  'system_daily_average': {
    en: 'system daily average',
    he: 'ממוצע יומי מערכת'
  },
  'today': {
    en: 'Today',
    he: 'היום'
  },
  'monthly': {
    en: 'Monthly',
    he: 'חודשי'
  },
  'benchmarks': {
    en: 'Benchmarks that compare to the environment',
    he: 'מדדים השוואתים לסביבה'
  },
  'weekly': {
    en: 'Weekly',
    he: 'שבועי'
  },
  'three_days': {
    en: 'Three Days',
    he: 'תלת יומי'
  },
  'yesterday': {
    en: 'Yesterday',
    he: 'אתמול'
  },
  'communication': {
    en: 'Communication',
    he: 'תקשורת'
  },
  'portal': {
    en: 'Portal',
    he: 'פורטל'
  },
  'system Name': {
    en: 'System Name',
    he: 'שם מערכת'
  },
  'tested': {
    en: 'Tested',
    he: 'נבדק'
  },
  'total_kv': {
    en: 'Total KV',
    he: 'סה"כ ק"ו'
  },
  'active': {
    en: 'Active',
    he: 'פעיל'
  },
  'inactive': {
    en: 'Inactive',
    he: 'לא פעיל'
  },
};
