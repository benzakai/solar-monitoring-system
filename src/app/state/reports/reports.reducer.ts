import { createReducer, on } from '@ngrx/store';
import { Person } from '../../domain/person';
import { ReportData } from '../../domain/report';
import { Email } from '../../domain/email'; // Import akcji

export interface State {
  selectedDate: Date | null;
  clients: Person[];
  systemsByClientId: { [clientId: string]: any[] };
  reportsByClientId: { [key: string]: ReportData };
  emailsByClientId: { [key: string]: Email };
  error: any;
}

export const initialState: State = {
  selectedDate: null,
  clients: [],
  systemsByClientId: {},
  reportsByClientId: {},
  emailsByClientId: {},
  error: null,
};

export const clientReducer = createReducer(
  initialState,
  on(fromActions.loadSelectedDate, (state, { date }) => ({
    ...state,
    selectedDate: date,
  })),
  on(fromActions.loadClientsSuccess, (state, { clients }) => ({
    ...state,
    clients,
  })),
  on(
    fromActions.loadSystemsForClientsSuccess,
    (state, { systemsByClientId }) => ({
      ...state,
      systemsByClientId,
    })
  ),
  on(fromActions.loadReportsFromMonthSuccess, (state, { reports }) => ({
    ...state,
    reportsByClientId: reports,
  })),
  on(fromActions.loadEmailsFromMonthSuccess, (state, { emailsByClientId }) => ({
    ...state,
    emailsByClientId,
  })),
  on(
    fromActions.loadClientsFailure,
    fromActions.loadSystemsForClientsFailure,
    fromActions.loadReportsFromMonthFailure,
    fromActions.loadEmailsFromMonthFailure,
    (state, { error }) => ({
      ...state,
      error,
    })
  )
);
