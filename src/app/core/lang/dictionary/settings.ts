export const settings = {
  title: {
    en: 'Settings',
    he: 'הגדרות',
  },
  subtitle: {
    en: 'Manage global preferences that affect all monitored systems.',
    he: 'ניהול הגדרות מערכת המשפיעות על כל מערכות הניטור.',
  },
  placeholder: {
    message: {
      en: 'Template view only – functionality will be added soon.',
      he: 'תצוגה בלבד – הפונקציונליות תתווסף בהמשך.',
    },
  },
  display: {
    title: {
      en: 'Display',
      he: 'תצוגה',
    },
    description: {
      en: 'Adjust typography for the entire workspace.',
      he: 'התאם את טיפוגרפיית המערכת כולה.',
    },
    sliderLabel: {
      en: 'Font Size',
      he: 'גודל גופן',
    },
    primaryAction: {
      en: 'Apply',
      he: 'החלה',
    },
    secondaryAction: {
      en: 'Reset',
      he: 'איפוס',
    },
  },
  energy: {
    title: {
      en: 'Energy Refresh',
      he: 'רענון נתוני אנרגיה',
    },
    subtitle: {
      en: 'Trigger manual refresh tasks for the energy pipeline.',
      he: 'הפעל תהליכי רענון ידניים בנתיבי האנרגיה.',
    },
    hourLabel: {
      en: 'Refresh Daily Data',
      he: 'עדכון נתונים יומיים',
    },
    dayLabel: {
      en: 'Refresh Yearly Data',
      he: 'עדכון נתונים שנתיים',
    },
    monthLabel: {
      en: 'Refresh Multi-year Data',
      he: 'עדכון נתונים רב-שנתיים',
    },
    descriptions: {
      hour: {
        en: 'Runs every hour (HH:05) between 07:05 and 20:05.',
        he: 'ריצה אוטומטית כל שעה (HH:05) בין 07:05 ל-20:05.',
      },
      day: {
        en: 'Runs daily at 06:00 for historical days.',
        he: 'ריצה אוטומטית בכל יום בשעה 06:00 לימים קודמים.',
      },
      month: {
        en: 'Runs automatically on the 1st of every month.',
        he: 'ריצה אוטומטית בכל 1 לחודש.',
      },
    },
  },
  prediction: {
    title: {
      en: 'Annual Prediction',
      he: 'חישוב צפי שנתי',
    },
    description: {
      en: 'Configure the distribution model that fuels the automatic production forecasts.',
      he: 'הגדרת מודל ההתפלגות המשמש את חישובי הצפי האוטומטי.',
    },
    distributions: {
      normal: {
        en: 'Regular Monthly Distribution (%)',
        he: 'התפלגות חודשית רגילה (%)',
      },
      taoz: {
        en: 'TOU Monthly Distribution (%)',
        he: 'התפלגות חודשית תעו״ז (%)',
      },
    },
    fields: {
      defaultAnnual: {
        en: 'Estimated Annual Yield (kWh/kWp)',
        he: 'צפי שנתי מוערך (kWh/kWp)',
      },
      trackerFactor: {
        en: 'Tracker Bonus (%)',
        he: 'תוספת טרקר (%)',
      },
      autoWashFactor: {
        en: 'Auto-wash Bonus (%)',
        he: 'תוספת שטיפה אוטומטית (%)',
      },
      azimuthFactor: {
        en: 'Azimuth Derate – per 30° (%)',
        he: 'פחת אזימוט – לכל ‎30°‎ (%)',
      },
      ageFactor: {
        en: 'Yearly Degradation (%)',
        he: 'פחת שנתי (%)',
      },
    },
    actions: {
      save: {
        en: 'Save',
        he: 'שמירה',
      },
    },
    validation: {
      invalidDistribution: {
        en: 'Distribution must total 100% (±1%).',
        he: 'ההתפלגות חייבת להסתכם ל-100% (סטייה עד ‎1%‎).',
      },
    },
  },
  taoz: {
    title: {
      en: 'TOU Tariff',
      he: 'תעריף תעו״ז',
    },
    description: {
      en: 'Maintain the dynamic tariffs that drive TOU revenue calculations.',
      he: 'ניהול התעריפים הדינמיים לחישובי הכנסות במערכות תעו״ז.',
    },
    columns: {
      summer: {
        en: 'Summer',
        he: 'קיץ',
      },
      winter: {
        en: 'Winter',
        he: 'חורף',
      },
      between: {
        en: 'Shoulder',
        he: 'עונות מעבר',
      },
    },
    rows: {
      high: {
        en: 'High TOU',
        he: 'תעו״ז גבוה',
      },
      low: {
        en: 'Low TOU',
        he: 'תעו״ז נמוך',
      },
    },
    actions: {
      save: {
        en: 'Save',
        he: 'שמירה',
      },
    },
  },
  malfunction_types: {
    title: {
      en: 'Malfunction Classification',
      he: 'סיווג תקלות',
    },
    description: {
      en: 'Define the hierarchy, severity and codes used across the operations center.',
      he: 'הגדרת היררכיית התקלות, רמת החומרה והקודים למוקד התפעול.',
    },
    labels: {
      code: {
        en: 'Fault Code',
        he: 'קוד תקלה',
      },
      name: {
        en: 'Fault Name',
        he: 'שם התקלה',
      },
      severity: {
        en: 'Default Severity',
        he: 'חומרה ברירת מחדל',
      },
    },
    actions: {
      addType: {
        en: 'Add Malfunction Type',
        he: 'הוספת סוג תקלה',
      },
      addSubType: {
        en: 'Add Sub-type',
        he: 'הוספת תת-תקלה',
      },
      delete: {
        en: 'Delete',
        he: 'מחיקה',
      },
      save: {
        en: 'Save',
        he: 'שמירה',
      },
    },
  },
  warnings: {
    title: {
      en: 'Warnings',
      he: 'התראות',
    },
    description: {
      en: 'Configure alerting thresholds, schedules and reset options.',
      he: 'הגדרת ספי התראה, זמני בדיקה ואפשרויות איפוס.',
    },
  },
  sending: {
    title: {
      en: 'Dispatch Testing',
      he: 'בדיקת שליחות',
    },
    description: {
      en: 'Route outgoing notifications to a test inbox before sending to customers.',
      he: 'ניתוב הודעות יוצאות לתיבת בדיקה לפני שליחה ללקוחות.',
    },
    emailPlaceholder: {
      en: 'test@email.com',
      he: 'test@email.com',
    },
  },
  emails: {
    title: {
      en: 'Email Templates',
      he: 'תוכן אימיילים',
    },
    description: {
      en: 'Maintain the wording for the automated communications.',
      he: 'ניהול נוסחי התקשורת האוטומטית.',
    },
    labels: {
      subject: {
        en: 'Subject',
        he: 'נושא',
      },
      body: {
        en: 'Body',
        he: 'גוף הודעה',
      },
    },
  },
  templates: {
    title: {
      en: 'Text Templates',
      he: 'תבניות טקסט',
    },
    description: {
      en: 'Reusable snippets for proposals and customer communication.',
      he: 'קטעי טקסט חוזרים להצעות מחיר ותקשורת לקוח.',
    },
  },
};


