/* Reports module utility helper functions */

import { ID_SUBSTRING_START, ID_SUBSTRING_END, RADIX_BASE_36 } from '#src/reports/constants/reports.constants.js';

/* Generate a unique alphanumeric report identifier */
export function generateUniqueReportId(): string {
  return Math.random()
    .toString(RADIX_BASE_36)
    .substring(ID_SUBSTRING_START, ID_SUBSTRING_END)
    .toUpperCase();
}
