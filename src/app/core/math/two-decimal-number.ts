import { formatNumber } from '@angular/common';

export const twoDecimalNumber = (v: number, invalid = '') => {
  if (isNaN(v)) {
    return invalid;
  }
  return formatNumber(v, 'en-US', v < 100 ? '1.2-2' : '1.0-0');
};
