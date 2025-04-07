import {AbstractControl} from '@angular/forms';
import {formatNumber} from '@angular/common';

export class Utilities {

  // Return whether the given object exists - For filtering functions typing
  static IsExist<T>(obj: T | null | undefined) : obj is T {
    return (obj ?? null) !== null;
  }

  // Whether the given query is the prefix of some of the given item words
  static StringSearch(item: string, q: string) : boolean {
    const queryWords = q.trim().toLowerCase().split(' ');
    const itemWords = item.toLowerCase().split(' ');
    return queryWords.every(qw => itemWords.some(iw => iw.startsWith(qw)));
  }

  // Get ratio as percents
  static AsPercent(ratio: number, invalid: string = '') : string {
    if (!isNaN(ratio)) {
      let str = Math.round(Math.abs(ratio) * 100) + '%';
      str = str.replace('Infinity%', '∞');
      return str;
    } else {
      return invalid;
    }
  }

  // Show numeric data with two places after decimal dot (unless greater than 100)
  static TwoDecimalNumber(v: number, invalid = '') : string {
    if (isNaN(v)) {
      return invalid;
    }
    return formatNumber(v, 'en-US', v < 100 ? '1.2-2' : '1.0-0');
  }

  static AsPrice(v: number, invalid: string = '') : string {
    if (isNaN(v) || v === null) {
      return invalid;
    }
    return this.TwoDecimalNumber(v) + ' ₪';
  }

  static DownloadFileFromURL(url: string, fileName: string) {
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.setAttribute('download', fileName);
      a.click();
      a.remove();
    }
  }

  // Validator for arrays
  static MustSelectValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value || !Array.isArray(control.value) || !control.value.length) {
      return {'valueSelected': false};
    }
    return null;
  }

  static SetFullScreen() {
    document.documentElement.requestFullscreen?.();
  }

  /**
   * Return all the unique values from a list of array
   * @example: [[1,2,3,4,5], [3,5,7,2], [8,8,7,2,5]] will return [1,2,3,4,5,7,8]
   * @param arr - array of arrays
   * @param exclude - List of values to exclude from the flatten list
   * @param keepFalsy - whether to keep falsy values (default: FALSE)
   */
  static FlattenValues<T>(arr: T[][], exclude: T[] = [], keepFalsy: boolean = false) : T[] {
    const flat = arr.reduce((accumulator, value) => accumulator.concat(value), []);
    const unique = new Set<T>(flat);
    exclude.forEach(value => unique.delete(value));
    return [...unique.values()].filter(v => !!v || keepFalsy);
  }

  /**
   * Get only the exclusive values of each array
   */
  static OmitCommonElements<T>(ar1: T[], ar2: T[]) : [T[], T[]] {
    const newAr1 = ar1.filter(v => !ar2.includes(v));
    const newAr2 = ar2.filter(v => !ar1.includes(v));
    return [newAr1, newAr2];
  }

  static UniqueValues<T>(values: T[]) : T[] {
    const set = new Set<T>(values);
    return [...set.values()];
  }

  static ChartAxis(num: number): {maxValue: number, tickAmount: number} {
    // Number of chars (not including minus and decimal dot)
    const chars = Math.abs(Math.ceil(num)).toString().length;
    // The log scale of the number
    const scale = Math.pow(10, Math.max(chars - 1));
    // The ticks gap should be the scale itself, or half or quarter of it
    const decs = num / scale;
    let tickGap: number = scale;
    if (decs <= 6) {
      tickGap = 0.5 * scale;
    }
    if (decs <= 2) {
      tickGap = 0.25 * scale;
    }
    // Calc the max value
    const tickAmount = Math.ceil(num / tickGap);
    const maxValue = tickGap * tickAmount;
    return {maxValue, tickAmount};
  }

}
