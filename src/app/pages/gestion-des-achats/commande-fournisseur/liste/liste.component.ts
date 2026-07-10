import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CommandeFournisseurService } from '../../../../services/commande-fournisseur/commande-fournisseur.service';
import { AuthService } from '../../../../services/auth/auth.service';
import { BoutiqueService } from '../../../../services/boutique/boutique.service';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-commande-fournisseur-liste',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './liste.component.html',
  providers: [ToastrService],
})
export default class CommandeFournisseurListeComponent implements OnInit, OnDestroy {
  commandes: any[] = [];
  boutiques: any[] = [];
  currentUser: any;
  selectedBoutiqueId: number | null = null;
  isLoading = false;
  detailCommande: any = null;
  mobileDetailItem: any = null;

  // Réception
  commandeARecevoir: any = null;
  lignesReception: { detail_id: number; nom: string; quantite: number; quantite_recue: number; prix_unitaire: number }[] = [];
  isReceiving = false;

  readonly STATUTS: { value: string; label: string; css: string }[] = [
    { value: 'brouillon',    label: 'Brouillon',       css: 'secondary' },
    { value: 'envoye',       label: 'Envoyé',           css: 'info'      },
    { value: 'recu_partiel', label: 'Reçu partiellement', css: 'warning' },
    { value: 'recu_total',   label: 'Reçu totalement',  css: 'success'   },
    { value: 'annule',       label: 'Annulé',           css: 'danger'    },
  ];

  readonly FLUX: Record<string, string[]> = {
    brouillon:    ['envoye', 'annule'],
    envoye:       ['recu_partiel', 'recu_total', 'annule'],
    recu_partiel: ['recu_total', 'annule'],
    recu_total:   [],
    annule:       [],
  };

  constructor(
    private commandeService: CommandeFournisseurService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
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
        this.loadCommandes();
      }
    });
  }

  ngOnDestroy(): void { this.destroyDataTable(); }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({ next: (r: any) => { this.boutiques = r?.data ?? []; } });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
        next: (r: any) => { this.boutiques = r?.data ?? []; }
      });
    } else {
      this.boutiques = this.currentUser?.boutique ? [this.currentUser.boutique] : [];
    }
  }

  onBoutiqueChange(): void { this.loadCommandes(); }

  loadCommandes(): void {
    if (!this.selectedBoutiqueId) { this.commandes = []; return; }
    this.isLoading = true;
    this.destroyDataTable();
    this.commandeService.getAll({ boutique: this.selectedBoutiqueId, page: 1, limit: 500 })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (r: any) => {
          this.commandes = r?.data?.items ?? r?.data ?? [];
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) this.initDataTable();
          }, 50);
        },
        error: () => { this.commandes = []; }
      });
  }

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('.dt-commandes-fournisseur');
      if ($.fn?.DataTable?.isDataTable(t)) t.DataTable().destroy();
    } catch {}
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const self = this;
    try {
      const table = $('.dt-commandes-fournisseur').DataTable({
        data: this.commandes,
        columns: [
          {
            data: 'reference',
            render: (d: any, _t: any, row: any) =>
              `<span class="badge bg-light text-dark border font-monospace">${d || '#' + row.id}</span>`
          },
          {
            data: 'fournisseur',
            render: (d: any) => d ? `<span class="fw-semibold">${d.nom}</span>` : '<span class="text-muted">—</span>'
          },
          {
            data: 'created_at',
            render: (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
          },
          {
            data: 'date_livraison_prevue',
            render: (d: any, _t: any, row: any) => {
              if (!d) return '—';
              const date = new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const enRetard = !['recu_total', 'annule'].includes(row.statut) && new Date(d) < new Date();
              return enRetard ? `<span class="text-danger fw-semibold">${date} <i class="bi bi-exclamation-triangle-fill"></i></span>` : date;
            }
          },
          {
            data: 'montant_total',
            render: (d: any) => `<span class="fw-semibold">${Number(d ?? 0).toLocaleString('fr-FR')} FCFA</span>`
          },
          {
            data: 'statut',
            render: (d: any) => {
              const s = self.STATUTS.find(x => x.value === d);
              return `<span class="badge bg-${s?.css ?? 'secondary'}">${s?.label ?? d}</span>`;
            }
          },
          {
            data: null,
            orderable: false,
            render: (_d: any, _t: any, row: any) => {
              const statut = row.statut;
              const id = row.id;
              const peutChanger  = (self.FLUX[statut] ?? []).length > 0;
              const peutRecevoir = statut !== 'annule' && statut !== 'recu_total';
              const peutSuppr    = statut === 'brouillon' || statut === 'annule';
              return `
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary btn-detail" data-id="${id}" title="Détail">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn btn-outline-dark btn-pdf" data-id="${id}" title="Bon de commande PDF">
                    <i class="bi bi-file-earmark-pdf"></i>
                  </button>
                  ${statut === 'brouillon' ? `<a href="/gestion-des-approvisionnements/commandes-fournisseur/${id}/edit" class="btn btn-outline-primary" title="Modifier"><i class="bi bi-pencil"></i></a>` : ''}
                  ${peutChanger ? `<button class="btn btn-outline-info btn-statut" data-id="${id}" data-statut="${statut}" title="Changer statut"><i class="bi bi-arrow-repeat"></i></button>` : ''}
                  ${peutRecevoir ? `<button class="btn btn-success btn-recevoir" data-id="${id}" title="Réceptionner"><i class="bi bi-box-arrow-in-down"></i></button>` : ''}
                  ${peutSuppr ? `<button class="btn btn-outline-danger btn-suppr" data-id="${id}" title="Supprimer"><i class="bi bi-trash"></i></button>` : ''}
                </div>`;
            }
          },
        ],
        language: {
          emptyTable:  'Aucune commande fournisseur',
          search:      'Rechercher :',
          info:        'Affichage de _START_ à _END_ sur _TOTAL_ commande(s)',
          infoEmpty:   'Aucune commande',
          zeroRecords: 'Aucun résultat',
          lengthMenu:  'Afficher _MENU_ commandes',
          paginate:    { first: '«', last: '»', next: '›', previous: '‹' },
        },
        dom: '<"row mb-2"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        buttons: [
          { extend: 'excel', text: '<i class="bi bi-file-earmark-excel"></i> Excel', className: 'btn btn-success btn-sm me-1' },
          { extend: 'pdf',   text: '<i class="bi bi-file-earmark-pdf"></i> PDF',     className: 'btn btn-danger btn-sm' },
        ],
        order: [[2, 'desc']],
        pageLength: 20,
        responsive: true,
        autoWidth: false,
      });

      table.on('click', '.btn-detail', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        self.ouvrirDetail(id);
      });

      table.on('click', '.btn-pdf', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        self.ouvrirPdf(id);
      });

      table.on('click', '.btn-statut', function(this: HTMLElement) {
        const id     = parseInt($(this).data('id'));
        const statut = $(this).data('statut');
        self.changerStatut(id, statut);
      });

      table.on('click', '.btn-recevoir', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        const c  = self.commandes.find(x => x.id === id);
        if (c) self.ouvrirModalReception(c);
      });

      table.on('click', '.btn-suppr', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        const c  = self.commandes.find(x => x.id === id);
        if (c) self.supprimer(c);
      });

    } catch (e) { console.error(e); }
  }

  statutLabel(v: string): string { return this.STATUTS.find(s => s.value === v)?.label ?? v; }
  statutCss(v: string): string   { return this.STATUTS.find(s => s.value === v)?.css   ?? 'secondary'; }

  prochainsStatuts(current: string): { value: string; label: string }[] {
    return (this.FLUX[current] ?? []).map(v => this.STATUTS.find(s => s.value === v)!).filter(Boolean);
  }

  ouvrirDetail(id: number): void {
    this.commandeService.getById(id).subscribe({
      next: (r: any) => {
        this.detailCommande = r?.data || r;
        const m = document.getElementById('modal-detail-cf');
        if (m) new bootstrap.Modal(m).show();
      },
      error: () => this.toastr.error('Impossible de charger le détail')
    });
  }

  ouvrirPdf(id: number): void {
    this.commandeService.downloadBonCommande(id).subscribe({
      next: (blob: any) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      },
      error: () => this.toastr.error('Impossible de générer le PDF')
    });
  }

  async changerStatut(id: number, currentStatut: string): Promise<void> {
    const prochains = this.prochainsStatuts(currentStatut);
    if (!prochains.length) return;

    const options: Record<string, string> = {};
    prochains.forEach(s => { options[s.value] = s.label; });

    const { value: statut, isConfirmed } = await Swal.fire({
      title: 'Changer le statut',
      input: 'select',
      inputOptions: options,
      inputPlaceholder: '— Sélectionner un statut —',
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
      inputValidator: v => !v ? 'Veuillez sélectionner un statut' : null,
    });
    if (!isConfirmed || !statut) return;

    // Réception partielle ou totale → ouvrir la modale de saisie des quantités
    if (statut === 'recu_partiel' || statut === 'recu_total') {
      const c = this.commandes.find(x => x.id === id);
      if (c) this.ouvrirModalReception(c);
      return;
    }

    this.commandeService.changerStatut(id, statut).subscribe({
      next: () => {
        this.toastr.success('Statut mis à jour');
        this.loadCommandes();
        if (statut === 'envoye') {
          Swal.fire({
            icon: 'success',
            title: 'Commande envoyée',
            text: 'Voulez-vous imprimer le bon de commande ?',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-printer me-1"></i> Imprimer',
            cancelButtonText: 'Plus tard',
            confirmButtonColor: '#1a56db',
          }).then(r => {
            if (r.isConfirmed) this.ouvrirPdf(id);
          });
        }
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }

  ouvrirModalReception(commande: any): void {
    this.commandeService.getById(commande.id).subscribe({
      next: (r: any) => {
        this.commandeARecevoir = r?.data ?? r;
        this.lignesReception = (this.commandeARecevoir.detail_commande ?? []).map((d: any) => ({
          detail_id:     d.id,
          nom:           d.produit?.nom ?? '—',
          quantite:      d.quantite,
          quantite_recue: d.quantite,
          prix_unitaire: d.prix_unitaire,
        }));
        const m = document.getElementById('modal-reception-cf');
        if (m) new bootstrap.Modal(m).show();
      },
      error: () => this.toastr.error('Impossible de charger le détail de la commande')
    });
  }

  get montantReception(): number {
    return this.lignesReception.reduce(
      (sum, l) => sum + (Number(l.quantite_recue) || 0) * l.prix_unitaire, 0
    );
  }

  confirmerReception(): void {
    const lignes = this.lignesReception.map(l => ({
      detail_id:     l.detail_id,
      quantite_recue: Number(l.quantite_recue) || 0,
    }));

    this.isReceiving = true;
    this.commandeService.recevoir(this.commandeARecevoir.id, lignes).subscribe({
      next: () => {
        this.isReceiving = false;
        const m = document.getElementById('modal-reception-cf');
        if (m) bootstrap.Modal.getInstance(m)?.hide();
        Swal.fire({ icon: 'success', title: 'Réception enregistrée', text: 'L\'approvisionnement a été créé et le stock mis à jour.', timer: 2500, showConfirmButton: false });
        this.loadCommandes();
      },
      error: (e: any) => {
        this.isReceiving = false;
        this.toastr.error(e?.error?.message || 'Erreur lors de la réception');
      }
    });
  }

  async supprimer(commande: any): Promise<void> {
    const result = await Swal.fire({
      title: 'Supprimer la commande ?',
      text: `${commande.fournisseur?.nom ?? '—'} — ${commande.reference || '#' + commande.id}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    });
    if (!result.isConfirmed) return;

    this.commandeService.remove(commande.id).subscribe({
      next: () => { this.toastr.success('Commande supprimée'); this.loadCommandes(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }
}
