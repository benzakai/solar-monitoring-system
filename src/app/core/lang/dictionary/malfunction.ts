import { MalfunctionHandler } from '../../../domain/malfunction';

export const malfunction = {
  customerPrice: { en: 'Customer Price', he: 'מחיר ללקוח' },
  golanSolarPrice: { en: 'Golan Solar Price', he: 'מחיר גולן סולאר' },
  code: { en: 'Error Code', he: 'קוד שגיאה' },
  tracingTime: { en: 'Tracing Date', he: 'תאריך מעקב' },
  handler: { en: 'Handler', he: 'אחראי' },
  reportText: { en: 'Report Status', he: 'דיווח סטטוס' },
  notToReport: { en: 'No Monthly Report', he: 'אין דוח חודשי' },
  openTime: { en: 'Open Date', he: 'תאריך פתיחה' },
  closeTime: { en: 'Close Date', he: 'תאריך סגירה' },
  type: { en: 'Malfunction Type', he: 'סוג תקלה' },
  subType: { en: 'Sub-type', he: 'תת-סוג' },
  severity: { en: 'Severity', he: 'חומרה' },
  description: { en: 'Description', he: 'תיאור' },
  newEntry: { en: 'New Entry', he: 'פתיחה מחדש' },
  delete: { en: 'Delete Issue', he: 'מחיקת תקלה' },
  cancel: { en: 'Cancel', he: 'ביטול' },
  openIssue: { en: 'Issue Open', he: 'תקלה נפתחה' },
  resolved: { en: 'Issue Resolved', he: 'תקלה נפתרה' },
  save: { en: 'Save', he: 'שמירה' },
  dataSaved: {
    en: 'Data saved',
    he: 'הנתונים נשמרו',
  },
  header: { en: 'Malfunction', he: 'תקלה' },
  severityType: {
    '1': {
      he: 'נמוכה',
      en: 'Low',
    },
    '2': {
      he: 'בינונית',
      en: 'Medium',
    },
    '3': {
      he: 'גבוהה',
      en: 'High',
    },
  },
  dialogDelete: {
    confirm: {
      he: 'מחיקת תקלה',
      en: 'Delete fault',
    },
    question: {
      he: 'האם למחוק את התקלה הנוכחית?',
      en: 'Do you want to delete the current fault?',
    },
    deletion: {
      he: 'מחיקה',
      en: 'Deletion',
    },
    cancel: {
      he: 'ביטול',
      en: 'Cancel',
    },
  },
  logs: {
    header: {
      he: 'לוג',
      en: 'Logs',
    },
    text: {
      he: 'טקסט',
      en: 'Text',
    },
    handler: {
      he: 'מוקדן',
      en: 'Handler',
    },
    action: {
      he: 'פעולה',
      en: 'Action',
    },
    date: {
      he: 'תאריך ושעה',
      en: 'Date and Time',
    },
    actionTypes: {
      open: { en: 'Open', he: 'יצירה' },
      close: { en: 'Close', he: 'סגירה' },
      addComment: { en: 'Add Comment', he: 'הערה' },
      sendMsgToClient: { en: 'Send Message to Client', he: 'הודעה ללקוח' },
      sendMsgToGroup: { en: 'Send Message to Group', he: 'הודעה לקבוצה' },
      reopen: { en: 'Reopen', he: 'פתיחה מחדש' },
      comment: { en: 'Comment', he: 'הערה' },
    },
  },
  issueClose: {
    header: {
      he: 'סגירת תקלה',
      en: 'Close Issue',
    },
    closingDate: {
      he: 'תאריך סגירה',
      en: 'Closing Date',
    },
    confirmClose: {
      en: 'Close issue',
      he: 'סגירת תקלה',
    },
  },
  handler_names: {
    [MalfunctionHandler.CENTER]: { en: 'Center', he: 'מוקד' },
    [MalfunctionHandler.CUSTOMER]: { en: 'Customer', he: 'לקוח' },
    [MalfunctionHandler.SOLAR_EDGE]: { en: 'SolarEdge', he: "סולאראדג'" },
    [MalfunctionHandler.LADICO]: { en: 'Ladico', he: 'לדיקו' },
    [MalfunctionHandler.INSTALLER]: { en: 'Installer', he: 'מתקין' },
    [MalfunctionHandler.IN_TECH]: {
      en: 'In-house Technician',
      he: 'טכנאי מוקד',
    },
    [MalfunctionHandler.OUT_TECH]: {
      en: 'External Technician',
      he: 'טכנאי חיצוני',
    },
  },
  types: {
    optimizer: { en: 'Optimizer', he: 'אופטימייזר' },
    other: { en: 'Other', he: 'אחר' },
    insulation: { en: 'Insulation', he: 'זליגה' },
    Production: { en: 'Production', he: 'ייצור' },
    equipment: { en: 'Equipment', he: 'מאוורר' },
    inverter: { en: 'Inverter', he: 'ממיר' },
    voltage: { en: 'Voltage', he: 'מתח מהרשת' },
    string: { en: 'String', he: 'סטרינג' },
    panel: { en: 'Panel', he: 'פאנל' },
    production: { en: 'Production', he: 'תפוקה' },
    connection: { en: 'Connection', he: 'תקשורת' },
  },
  list: {
    edit: { he: 'עריכה', en: 'Edit' },
    contact: { he: 'יצירת קשר', en: 'Contact' },
    tracingDate: { he: 'תאריך מעקב', en: 'Tracing Date' },
    difference: { he: 'הפרש', en: 'Difference' },
    daysOfMalfunction: { he: 'ימי תקלה', en: 'Days of Malfunction' },
    severity: { he: 'חומרה', en: 'Severity' },
    reportStatus: { he: 'סטטוס דוח', en: 'Report Status' },
    malfunctionType: { he: 'סוג התקלה', en: 'Malfunction Type' },
    roofType: { he: 'סוג גג', en: 'Roof Type' },
    portal: { he: 'פורטל', en: 'Portal' },
    systemName: { he: 'שם מערכת', en: 'System Name' },
  },
};
