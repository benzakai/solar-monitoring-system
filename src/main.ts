import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from './app/firebase';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideFirebaseApp } from '@angular/fire/app';
import { routes } from './app/app.routes';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import {getAuth, provideAuth} from '@angular/fire/auth';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import {LANGUAGE, language, LANGUAGE_DICTIONARY} from './lang';
import {BehaviorSubject} from 'rxjs';

const app = initializeApp(firebaseConfig);

bootstrapApplication(AppComponent, {
  providers: [
    provideFirebaseApp(() => app),
    provideFirestore(() => getFirestore(app)),
    provideAuth(() => getAuth()),
    provideRouter(routes),
    importProvidersFrom(BrowserAnimationsModule),
    { provide: FIREBASE_OPTIONS, useValue: firebaseConfig },
    { provide: LANGUAGE_DICTIONARY, useValue: language },
    { provide: LANGUAGE, useValue: new BehaviorSubject('he') },
  ],
}).catch((err) => console.error(err));
