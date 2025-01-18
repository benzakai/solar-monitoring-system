import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './app/firebase';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideFirebaseApp } from '@angular/fire/app';
import { routes } from './app/app.routes';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { importProvidersFrom, isDevMode } from '@angular/core';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { storeProviders } from './app/state';
import { LanguageService } from './app/core/lang/language.service';
import { LANGUAGE, language, LANGUAGE_DICTIONARY } from './app/core/lang';

const app = initializeApp(firebaseConfig);

bootstrapApplication(AppComponent, {
  providers: [
    provideFirebaseApp(() => app),
    provideFirestore(() => getFirestore(app)),
    provideAuth(() => getAuth()),
    provideRouter(routes),
    importProvidersFrom(BrowserAnimationsModule),
    { provide: MAT_DATE_LOCALE, useValue: 'he' },
    { provide: FIREBASE_OPTIONS, useValue: firebaseConfig },
    { provide: LANGUAGE_DICTIONARY, useValue: language },
    {
      provide: LANGUAGE,
      useFactory: (languageService: LanguageService) =>
        languageService.language$,
      deps: [LanguageService],
    },
    ...storeProviders,
  ],
}).catch((err) => console.error(err));
