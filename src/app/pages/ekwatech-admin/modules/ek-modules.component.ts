import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModuleService, ModuleCode, MODULE_LABELS } from '../../../services/modules/module.service';
import { HttpClientService } from '../../../services/http-client/http-client.service';
import { AuthService } from '../../../services/auth/auth.service';
import { environnement } from '../../../environnement/environnement';
import { NzSelectModule } from 'ng-zorro-antd/select';

interface Structure { id: number; nom: string; }
interface ModuleRow { module: ModuleCode; label: string; est_actif: boolean; }

@Component({
  selector: 'app-ek-modules',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule],
  templateUrl: './ek-modules.component.html',
})
export default class EkModulesComponent implements OnInit {
  private http = inject(HttpClientService);
  private moduleService = inject(ModuleService);
  private authService = inject(AuthService);
  private API = environnement.API_URL;

  structures: Structure[] = [];
  selectedStructureId: number | null = null;
  rows: ModuleRow[] = [];
  loading = false;
  saving = false;
  saved = false;

  readonly ALL_CODES: ModuleCode[] = [
    'commandes_fournisseurs', 'devis', 'commandes_clients',
    'retours_produits', 'caisse', 'ia', 'restauration',
    'clients', 'fournisseurs',
  ];

  ngOnInit(): void {
    this.http.get(`${this.API}/structure`).subscribe({
      next: (r: any) => {
        const list = r?.data ?? r;
        this.structures = Array.isArray(list) ? list : [];
      },
    });
  }

  onStructureChange(): void {
    if (!this.selectedStructureId) { this.rows = []; return; }
    this.loading = true;
    this.saved = false;
    this.moduleService.getByStructure(this.selectedStructureId).subscribe({
      next: (r: any) => {
        const data: { module: ModuleCode; est_actif: boolean }[] = Array.isArray(r) ? r : (r?.data ?? []);
        // Construire une ligne pour chaque module (même absents de la DB)
        this.rows = this.ALL_CODES.map((code) => {
          const found = data.find((d) => d.module === code);
          return { module: code, label: MODULE_LABELS[code], est_actif: found?.est_actif ?? false };
        });
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  toggleAll(val: boolean): void {
    this.rows.forEach((r) => (r.est_actif = val));
  }

  save(): void {
    if (!this.selectedStructureId) return;
    this.saving = true;
    this.saved = false;
    const modules = this.rows.map((r) => ({ module: r.module, est_actif: r.est_actif }));
    this.moduleService.updateModules(this.selectedStructureId, modules).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        // Si on gère la structure de l'utilisateur courant, mettre à jour l'état local
        const currentUser = this.authService.getUser();
        if (currentUser?.structure_id === this.selectedStructureId) {
          const activeModules = this.rows.filter(r => r.est_actif).map(r => r.module);
          this.moduleService.setModules(activeModules);
        }
      },
      error: () => { this.saving = false; },
    });
  }
}
