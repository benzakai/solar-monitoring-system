import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { HeaderPortalRemoteComponent } from '../../core/header/header-portal-remote.component';
import { SettingsDisplayCardComponent } from './components/display-card/settings-display-card.component';
import { SettingsEnergyCardComponent } from './components/energy-card/settings-energy-card.component';
import { SettingsPredictionCardComponent } from './components/prediction-card/settings-prediction-card.component';
import { SettingsMalfunctionTypesCardComponent } from './components/malfunction-types-card/settings-malfunction-types-card.component';
import { SettingsTaozCardComponent } from './components/taoz-card/settings-taoz-card.component';
import { SettingsWarningsCardComponent } from './components/warnings-card/settings-warnings-card.component';
import { SettingsSendingCardComponent } from './components/sending-card/settings-sending-card.component';
import { SettingsEmailsCardComponent } from './components/emails-card/settings-emails-card.component';
import { SettingsTemplatesCardComponent } from './components/templates-card/settings-templates-card.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    HeaderPortalRemoteComponent,
    SettingsDisplayCardComponent,
    SettingsEnergyCardComponent,
    SettingsPredictionCardComponent,
    SettingsMalfunctionTypesCardComponent,
    SettingsTaozCardComponent,
    SettingsWarningsCardComponent,
    SettingsSendingCardComponent,
    SettingsEmailsCardComponent,
    SettingsTemplatesCardComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {}


