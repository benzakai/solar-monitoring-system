export interface Malfunction {
  id: string;
  serial?: number;
  systemId: string;
  kwhKwpSnapshot: number | null;
  type?: [string, string];
  severity?: MalfunctionSeverity;
  description?: string;
  code: string | null;
  tracingTime?: string | null;
  handler: MalfunctionHandler | string | null;
  notToReport: boolean;
  reportText?: string;
  openTime: string;
  closeTime?: string;
  log: MalfunctionAction[];
  status: MalfunctionStatus;
  customerPrice: number | null;
  golanSolarPrice: number | null;
  requestNumber?: string;
  '#modified': number;
  days?: number;
}

export interface MalfunctionAction {
  action: MalfunctionActionType;
  time: number;
  by: string;
  text?: string;
}

export enum MalfunctionActionType {
  OPEN = 'open',
  CLOSE = 'close',
  ADD_COMMENT = 'comment',
  SEND_MSG_TO_CLIENT = 'msgToClient',
  SEND_MSG_TO_GROUP = 'msgToGroup',
  REOPEN = 'reopen',
}

export enum MalfunctionStatus {
  NOT_EXIST = '',
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum MalfunctionSeverity {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export enum MalfunctionHandler {
  CENTER = '#center',
  CUSTOMER = '#customer',
  // PRODUCER = '#producer',
  SOLAR_EDGE = '#solar-edge',
  LADICO = '#ladico',
  INSTALLER = '#installer',
  OUT_TECH = '#out-tech',
  IN_TECH = '#in-tech',
}

export const malfunctionTypesMap: { [key: string]: string } = {
  optimizer: 'אופטימייזר',
  other: 'אחר',
  insulation: 'זליגה',
  Production: 'ייצור',
  equipment: 'מאוורר',
  inverter: 'ממיר',
  voltage: 'מתח מהרשת',
  string: 'סטרינג',
  panel: 'פאנל',
  production: 'תפוקה',
  connection: 'תקשורת',
};
