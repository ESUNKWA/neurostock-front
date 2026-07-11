import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzSelectModule } from 'ng-zorro-antd/select';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { TableRestaurantService } from '../../../services/restaurant/table-restaurant.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { AuthService } from '../../../services/auth/auth.service';
import * as QRCode from 'qrcode';

declare var bootstrap: any;

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './tables.component.html',
  providers: [ToastrService],
})
export default class TablesComponent implements OnInit {
  tables: any[] = [];
  boutiques: any[] = [];
  currentUser: any;
  selectedBoutiqueId: number | null = null;
  isLoading = false;

  form: any = { numero: '', nom: '', capacite: 4, boutique: null };
  editingId: number | null = null;
  isSaving = false;

  qrTable: any = null;
  qrDataUrl = '';

  readonly STATUTS = [
    { value: 'libre',    label: 'Libre',    css: 'success' },
    { value: 'occupee',  label: 'Occupée',  css: 'danger'  },
    { value: 'reservee', label: 'Réservée', css: 'warning' },
  ];

  constructor(
    private tableService: TableRestaurantService,
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
      const code = user?.profil?.code?.toLowerCase();
      if (code !== 'admin' && code !== 'responsable_structure') {
        this.selectedBoutiqueId = user?.boutique?.id ?? null;
        if (this.selectedBoutiqueId) this.loadTables();
      }
    });
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    const autoSelect = (list: any[]) => {
      this.boutiques = list;
      if (!this.selectedBoutiqueId && list.length) {
        this.selectedBoutiqueId = list[0].id;
        this.loadTables();
      }
    };
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({ next: (r: any) => autoSelect(r?.data ?? []) });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
        next: (r: any) => autoSelect(r?.data ?? [])
      });
    } else {
      this.boutiques = this.currentUser?.boutique ? [this.currentUser.boutique] : [];
    }
  }

  onBoutiqueChange(): void { this.loadTables(); }

  loadTables(): void {
    if (!this.selectedBoutiqueId) { this.tables = []; return; }
    this.isLoading = true;
    this.tableService.getAll(this.selectedBoutiqueId).subscribe({
      next: (r: any) => { this.tables = r?.data ?? []; this.isLoading = false; },
      error: () => { this.tables = []; this.isLoading = false; }
    });
  }

  statutInfo(v: string) { return this.STATUTS.find(s => s.value === v) ?? { label: v, css: 'secondary' }; }

  ouvrirModalCreation(): void {
    this.editingId = null;
    this.form = { numero: '', nom: '', capacite: 4, boutique: this.selectedBoutiqueId };
    if (isPlatformBrowser(this.platformId)) {
      const m = document.getElementById('modal-table');
      if (m) new bootstrap.Modal(m).show();
    }
  }

  ouvrirModalEdit(table: any): void {
    this.editingId = table.id;
    this.form = { numero: table.numero, nom: table.nom ?? '', capacite: table.capacite, boutique: this.selectedBoutiqueId };
    if (isPlatformBrowser(this.platformId)) {
      const m = document.getElementById('modal-table');
      if (m) new bootstrap.Modal(m).show();
    }
  }

  sauvegarder(): void {
    if (!this.form.numero) { this.toastr.warning('Le numéro de table est requis'); return; }
    this.isSaving = true;
    const obs = this.editingId
      ? this.tableService.update(this.editingId, this.form)
      : this.tableService.create({ ...this.form, boutique: this.selectedBoutiqueId });

    obs.subscribe({
      next: () => {
        this.isSaving = false;
        const m = document.getElementById('modal-table');
        if (m) bootstrap.Modal.getInstance(m)?.hide();
        this.toastr.success(this.editingId ? 'Table modifiée' : 'Table créée');
        this.loadTables();
      },
      error: (e: any) => { this.isSaving = false; this.toastr.error(e?.error?.message || 'Erreur'); }
    });
  }

  async changerStatut(table: any): Promise<void> {
    const options: Record<string, string> = {};
    this.STATUTS.filter(s => s.value !== table.statut).forEach(s => { options[s.value] = s.label; });

    const { value: statut, isConfirmed } = await Swal.fire({
      title: `Table ${table.numero}`,
      input: 'select',
      inputOptions: options,
      inputPlaceholder: '— Changer le statut —',
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
    });
    if (!isConfirmed || !statut) return;

    this.tableService.changerStatut(table.id, statut).subscribe({
      next: () => { this.toastr.success('Statut mis à jour'); this.loadTables(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }

  async supprimer(table: any): Promise<void> {
    const r = await Swal.fire({
      title: `Supprimer la table ${table.numero} ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    });
    if (!r.isConfirmed) return;
    this.tableService.remove(table.id).subscribe({
      next: () => { this.toastr.success('Table supprimée'); this.loadTables(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }

  get isAdmin(): boolean {
    const c = this.currentUser?.profil?.code?.toLowerCase();
    return c === 'admin' || c === 'responsable_structure';
  }

  tablesParStatut(statut: string) { return this.tables.filter(t => t.statut === statut); }
  get totalLibres()   { return this.tablesParStatut('libre').length; }
  get totalOccupees() { return this.tablesParStatut('occupee').length; }
  get totalReservees(){ return this.tablesParStatut('reservee').length; }

  async afficherQr(table: any): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    this.qrTable = table;
    const url = `${window.location.origin}/menu?boutique=${this.selectedBoutiqueId}&table=${table.id}`;
    this.qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
    const m = document.getElementById('modal-qr');
    if (m) new bootstrap.Modal(m).show();
  }

  qrUrl(tableId: number): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    return `${window.location.origin}/menu?boutique=${this.selectedBoutiqueId}&table=${tableId}`;
  }

  imprimerQr(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const t = this.qrTable;
    win.document.write(`<!DOCTYPE html><html><head><title>QR Table ${t.numero}</title>
    <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;}
    img{width:260px;height:260px;} h2{margin-bottom:8px;}</style></head>
    <body><h2>Table ${t.numero}${t.nom ? ' — ' + t.nom : ''}</h2>
    <img src="${this.qrDataUrl}">
    <p style="margin-top:12px;font-size:.9rem;color:#666;">Scannez pour commander</p>
    <script>window.onload=()=>{window.print();}</script></body></html>`);
    win.document.close();
  }
}
