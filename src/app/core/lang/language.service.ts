import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly LANGUAGE_KEY = 'app_language';
  private languageSubject: BehaviorSubject<string>;

  constructor() {
    const savedLanguage = localStorage.getItem(this.LANGUAGE_KEY) || 'he';
    this.languageSubject = new BehaviorSubject<string>(savedLanguage);
  }

  get language$() {
    return this.languageSubject.asObservable();
  }

  getCurrentLang(): 'en' | 'he' {
    return ['en', 'he'].includes(this.languageSubject.value)
      ? (this.languageSubject.value as 'en' | 'he')
      : 'he';
  }

  setLanguage(language: string) {
    localStorage.setItem(this.LANGUAGE_KEY, language);
    this.languageSubject.next(language);
  }
}
