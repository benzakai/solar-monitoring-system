import { inject, Injectable } from '@angular/core';
import { SystemsService } from '../../endpoint/systems.service';
import { map, Observable } from 'rxjs';
import { System } from '../../domain/system';
import { SystemType } from './system-type';

@Injectable({
  providedIn: 'root',
})
export class SystemApiService {
  private systemsService = inject(SystemsService);

  public redirectToSystemApi(systemId: string): Observable<void> {
    return this.systemsService.getById(systemId).pipe(
      map((system) => {
        if (system) {
          window.location.href = this.getSystemApiUrl(system);
        }
      })
    );
  }

  private getSystemApiUrl(system: System): string {
    if (system.portalUrl) {
      return system.portalUrl;
    }
    switch (system.type) {
      case SystemType.SOLAR_EDGE:
        return `https://monitoring.solaredge.com/solaredge-web/p/site/${system.apiId[0]}/#/dashboard`;
      case SystemType.SMA:
        return `https://www.sunnyportal.com/FixedPages/Dashboard.aspx`;
      case SystemType.ENNEX:
        return `https://ennexos.sunnyportal.com/dashboard/initialize`;
      case SystemType.HUAWEI:
        return `https://90.84.185.150/securitys!tologin.action`;
      case SystemType.METEO_CONTROL:
        return `https://www1.meteocontrol.de/vcom/default`;
      case SystemType.REFU:
      case SystemType.TIGO:
      case SystemType.SUN_GROW:
        return `https://portaleu.isolarcloud.com/#/plantDetail/overview?psId=${system.apiId[0]}`;
      case SystemType.GROWATT:
        return `https://server.growatt.com/login?lang=en`;
      case SystemType.NETECO:
        return `https://90.84.179.231/index.action`;
      case SystemType.SOLAX:
        return `https://eu.solaxcloud.com/user-center/`;
      case SystemType.GOODWE:
        return `https://www.semsportal.com/PowerStation/powerstatus`;
      case SystemType.FUSION:
        return `https://eu5.fusionsolar.huawei.com/`;
      default:
        return '';
    }
  }
}
