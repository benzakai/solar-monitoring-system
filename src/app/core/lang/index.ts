import { InjectionToken } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { mainLang } from './dictionary/main';
import { header } from './dictionary/header';
import { createAlertDialogLang } from './dictionary/create-alert-dialog';
import { Dictionary } from './types/dictionary';
import { system_details } from './dictionary/system-details';

export const LANGUAGE_DICTIONARY: InjectionToken<Dictionary> =
  new InjectionToken<Dictionary>('LANGUAGE_DICTIONARY');
export const LANGUAGE: InjectionToken<BehaviorSubject<'en' | 'he'>> =
  new InjectionToken<BehaviorSubject<'en' | 'he'>>('LANGUAGE');

export const language: Dictionary = {
  ...mainLang,
  header,
  create_alert_dialog: createAlertDialogLang,
  system_details,
};
