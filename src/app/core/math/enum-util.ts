export class EnumUtil {
  static ListValues<T extends Record<string, any>>(e: T): T[keyof T][] {
    return Object.values(e).filter(
      (v) => typeof v !== 'number'
    ) as T[keyof T][];
  }
} 