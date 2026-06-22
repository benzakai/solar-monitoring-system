import { DateUtil } from '../date/DateUtil';

/**
 * Online / communication status for monitoring tables.
 *
 * Mirrors the legacy golan-solar `EnergyData.isConnected()` / `isDataUpdated()`
 * rules. Standard portals (incl. FSN) compare connection hour to data hour + 1,
 * because hourly saves exclude the current hour. External portals use same-hour.
 */
export class ConnectionStatus {
  private static readonly EXTERNAL_PORTALS = ['GW', 'NTC', 'SLX', 'GDW'];

  static isConnected(lastModified: number | undefined): boolean {
    if (!lastModified) {
      return false;
    }
    return Date.now() < lastModified + 2 * DateUtil.HOUR;
  }

  static lastDailyDataTime(daily: Array<{ time: number }> = []): number {
    return daily.slice(-1)[0]?.time ?? NaN;
  }

  static isDataUpdated(
    lastModified: number | undefined,
    lastDailyTime: number,
    portal: string
  ): boolean {
    if (!lastModified || !lastDailyTime || Number.isNaN(lastDailyTime)) {
      return false;
    }
    const connectionHour = new Date(lastModified).getHours();
    const dataHour = new Date(lastDailyTime).getHours();
    if (ConnectionStatus.EXTERNAL_PORTALS.includes(portal)) {
      return connectionHour === dataHour;
    }
    return connectionHour === dataHour + 1;
  }

  static isOnline(
    lastModified: number | undefined,
    daily: Array<{ time: number }> = [],
    portal: string
  ): boolean {
    return (
      ConnectionStatus.isConnected(lastModified) &&
      ConnectionStatus.isDataUpdated(
        lastModified,
        ConnectionStatus.lastDailyDataTime(daily),
        portal
      )
    );
  }
}
