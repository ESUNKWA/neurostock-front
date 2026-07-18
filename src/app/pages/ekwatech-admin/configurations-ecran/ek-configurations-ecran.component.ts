import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { HttpClientService } from '../../../services/http-client/http-client.service';
import { environnement } from '../../../environnement/environnement';

interface ConfigEcran {
  id: number;
  boutique_type: string | null;
  profil_code: string;
  ecran_cible: string;
}

@Component({
  selector: 'app-ek-configurations-ecran',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ek-configurations-ecran.component.html',
})
export default class EkConfigurationsEcranComponent implements OnInit {
  private http    = inject(HttpClientService);
  private toastr  = inject(ToastrService);
  private readonly API = environnement.API_URL;

  configs: ConfigEcran[] = [];
  loading  = false;
  saving   = false;

  readonly BOUTIQUE_TYPES = [
    { value: null,         label: '* (toutes)' },
    { value: 'boutique',   label: 'Boutique' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'entrepot',   label: 'Entrepôt' },
    { value: 'departement',label: 'Département' },
  ];

  readonly PROFILS = [
    'super_admin','responsable_structure', 'admin', 'gerant', 'magasinier',
    'caissier', 'vendeur', 'serveur', 'cuisiner', 'user',
  ];

  readonly ECRANS = [
    { value: 'dashboard',            label: 'Dashboard (gestion stock)' },
    { value: 'pos',                  label: 'POS — Caisse / Vente' },
    { value: 'restaurant-admin',     label: 'Restaurant — Admin / Gérant' },
    { value: 'restaurant-serveur',   label: 'Restaurant — Serveur' },
    { value: 'restaurant-caissier',  label: 'Restaurant — Caissier' },
    { value: 'restaurant-cuisine',   label: 'Restaurant — Cuisine' },
    { value: 'ekwatech',             label: 'Ekwatech Super Admin' },
  ];

  form = {
    boutique_type: null as string | null,
    profil_code:   '',
    ecran_cible:   '',
  };

  editingConfig: ConfigEcran | null = null;

  get isEditMode(): boolean { return this.editingConfig !== null; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get(`${this.API}/configuration-ecran`).subscribe({
      next: (r: any) => {
        this.configs = Array.isArray(r) ? r : (r?.data ?? []);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  edit(cfg: ConfigEcran): void {
    this.editingConfig = cfg;
    this.form = {
      boutique_type: cfg.boutique_type,
      profil_code:   cfg.profil_code,
      ecran_cible:   cfg.ecran_cible,
    };
  }

  cancel(): void {
    this.editingConfig = null;
    this.form = { boutique_type: null, profil_code: '', ecran_cible: '' };
  }

  save(): void {
    if (!this.form.profil_code || !this.form.ecran_cible) {
      this.toastr.warning('Profil et écran cible sont obligatoires');
      return;
    }
    this.saving = true;

    if (this.isEditMode && this.editingConfig) {
      // Supprimer l'ancienne entrée (la clé unique boutique_type+profil_code a peut-être changé)
      // puis créer la nouvelle via upsert
      this.http.delete(`${this.API}/configuration-ecran/${this.editingConfig.id}`).subscribe({
        next: () => {
          this.http.post(`${this.API}/configuration-ecran`, this.form).subscribe({
            next: () => {
              this.toastr.success('Configuration modifiée');
              this.cancel();
              this.saving = false;
              this.load();
            },
            error: (err: any) => {
              this.toastr.error(err?.error?.message || 'Erreur lors de la sauvegarde');
              this.saving = false;
              this.load();
            },
          });
        },
        error: () => {
          this.toastr.error('Erreur lors de la modification');
          this.saving = false;
        },
      });
    } else {
      this.http.post(`${this.API}/configuration-ecran`, this.form).subscribe({
        next: () => {
          this.toastr.success('Configuration enregistrée');
          this.cancel();
          this.saving = false;
          this.load();
        },
        error: (err: any) => {
          this.toastr.error(err?.error?.message || 'Erreur lors de la sauvegarde');
          this.saving = false;
        },
      });
    }
  }

  remove(id: number): void {
    if (!confirm('Supprimer cette configuration ?')) return;
    this.http.delete(`${this.API}/configuration-ecran/${id}`).subscribe({
      next: () => {
        this.toastr.success('Configuration supprimée');
        if (this.editingConfig?.id === id) this.cancel();
        this.load();
      },
      error: () => { this.toastr.error('Erreur lors de la suppression'); },
    });
  }

  labelEcran(val: string): string {
    return this.ECRANS.find(e => e.value === val)?.label ?? val;
  }

  labelType(val: string | null): string {
    return this.BOUTIQUE_TYPES.find(t => t.value === val)?.label ?? String(val);
  }
}
