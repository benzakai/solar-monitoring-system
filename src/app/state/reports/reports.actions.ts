import { createAction, props } from '@ngrx/store';
import { Person } from '../../domain/person';
import { ReportData } from '../../domain/report';
import { Email } from '../../domain/email';

// Akcja dla załadowania daty
export const loadSelectedDate = createAction(
  '[Date] Load Selected Date',
  props<{ date: Date }>()
);

// Akcje dla klientów
export const loadClients = createAction('[Client] Load Clients');
export const loadClientsSuccess = createAction(
  '[Client] Load Clients Success',
  props<{ clients: Person[] }>()
);
export const loadClientsFailure = createAction(
  '[Client] Load Clients Failure',
  props<{ error: any }>()
);

// Akcje dla systemów
export const loadSystemsForClients = createAction(
  '[System] Load Systems For Clients'
);
export const loadSystemsForClientsSuccess = createAction(
  '[System] Load Systems For Clients Success',
  props<{ systemsByClientId: { [clientId: string]: any[] } }>()
);

// Akcje dla raportów
export const loadReportsFromMonth = createAction(
  '[Report] Load Reports From Month',
  props<{ year: number; month: number }>()
);
export const loadReportsFromMonthSuccess = createAction(
  '[Report] Load Reports From Month Success',
  props<{ reports: { [key: string]: ReportData } }>()
);

// Akcje dla e-maili
export const loadEmailsFromMonth = createAction(
  '[Email] Load Emails From Month',
  props<{ year: number; month: number }>()
);
export const loadEmailsFromMonthSuccess = createAction(
  '[Email] Load Emails From Month Success',
  props<{ emailsByClientId: { [key: string]: Email } }>()
);
