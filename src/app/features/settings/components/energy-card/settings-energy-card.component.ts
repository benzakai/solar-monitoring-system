import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

@Component({
  selector: 'app-settings-energy-card',
  standalone: true,
  imports: [CommonModule, MatButtonModule, TranslatePipe],
  templateUrl: './settings-energy-card.component.html',
  styleUrl: './settings-energy-card.component.scss',
})
export class SettingsEnergyCardComponent {}


