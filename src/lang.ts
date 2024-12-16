import { InjectionToken } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Dictionary } from './lang/types/dictionary';
import { mainLang } from './lang/main';
import { createAlertDialogLang } from './lang/create-alert-dialog';
import { header } from './lang/header';

export const LANGUAGE_DICTIONARY: InjectionToken<Dictionary> =
  new InjectionToken<Dictionary>('LANGUAGE_DICTIONARY');
export const LANGUAGE: InjectionToken<BehaviorSubject<'en' | 'he'>> =
  new InjectionToken<BehaviorSubject<'en' | 'he'>>('LANGUAGE');

export const language: Dictionary = {
  ...mainLang,
  header,
  create_alert_dialog: createAlertDialogLang,
};
