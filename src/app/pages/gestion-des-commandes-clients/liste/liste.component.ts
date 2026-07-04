import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { CommandeClientService } from '../../../services/gestion-des-commandes-clients/commande-client.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-commande-client-liste',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './liste.component.html',
  providers: [ToastrService],
})
export default class ListeComponent implements OnInit, OnDestroy {
  commandes: any[]  = [];
  boutiques: any[]  = [];
  currentUser: any;
  selectedBoutiqueId: number | null = null;
  isLoading   = false;
  actionId: number | null = null;
  detailCommande: any = null;

  readonly STATUTS: { value: string; label: string; css: string }[] = [
    { value: 'en_attente',     label: 'En attente',     css: 'warning'  },
    { value: 'confirme',       label: 'Confirmé',       css: 'info'     },
    { value: 'en_preparation', label: 'En préparation', css: 'primary'  },
    { value: 'expedie',        label: 'Expédié',        css: 'dark'     },
    { value: 'livre',          label: 'Livré',          css: 'success'  },
    { value: 'annule',         label: 'Annulé',         css: 'danger'   },
  ];

  readonly FLUX: Record<string, string[]> = {
    en_attente:     ['confirme', 'annule'],
    confirme:       ['en_preparation', 'annule'],
    en_preparation: ['expedie', 'annule'],
    expedie:        ['livre'],
    livre:          [],
    annule:         [],
  };

  constructor(
    private commandeService: CommandeClientService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private toastr: ToastrService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  get isPos(): boolean {
    return this.router.url.startsWith('/pos');
  }

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
          // API retourne data.items (pas data directement)
          this.commandes = r?.data?.items ?? r?.data ?? [];
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) this.initDataTable();
          }, 50);
        },
        error: () => { this.commandes = []; }
      });
  }

  // ── DataTable ─────────────────────────────────────────────────────────────

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('.dt-commandes-clients');
      if ($.fn?.DataTable?.isDataTable(t)) t.DataTable().destroy();
    } catch {}
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const self = this;
    try {
      const table = $('.dt-commandes-clients').DataTable({
        data: this.commandes,
        columns: [
          {
            data: 'reference',
            render: (d: any, _t: any, row: any) =>
              `<span class="badge bg-light text-dark border font-monospace">${d || '#' + row.id}</span>`
          },
          {
            data: 'client',
            render: (d: any) => {
              if (!d) return '—';
              const nom = [d.prenoms, d.nom].filter(Boolean).join(' ') || d.nom || '—';
              const tel = d.telephone ? `<br><small class="text-muted">${d.telephone}</small>` : '';
              return `<span class="fw-semibold">${nom}</span>${tel}`;
            }
          },
          {
            data: 'created_at',
            render: (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
          },
          {
            data: 'date_livraison_prevue',
            render: (d: any, _t: any, row: any) => {
              if (!d) return '—';
              const date = new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
              const enRetard = row.statut !== 'livre' && row.statut !== 'annule' && new Date(d) < new Date();
              return enRetard ? `<span class="text-danger fw-semibold">${date}</span>` : date;
            }
          },
          {
            data: 'montant_total_apres_remise',
            render: (d: any, _t: any, row: any) => {
              const val = d ?? row.montant_total ?? 0;
              return `<span class="fw-semibold">${Number(val).toLocaleString('fr-FR')} FCFA</span>`;
            }
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
              const id     = row.id;
              const peutChanger  = (self.FLUX[statut] ?? []).filter(s => s !== 'livre').length > 0;
              const peutLivrer   = ['confirme', 'en_preparation', 'expedie'].includes(statut);
              const peutSuppr    = statut !== 'livre';
              const peutModifier = statut !== 'livre' && statut !== 'annule';
              return `
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary btn-detail" data-id="${id}" title="Détail">
                    <i class="bi bi-eye"></i>
                  </button>
                  ${peutModifier ? `<a href="${self.isPos ? '/pos/commandes' : '/commandes-clients'}/${id}/edit" class="btn btn-outline-primary" title="Modifier"><i class="bi bi-pencil"></i></a>` : ''}
                  ${peutChanger  ? `<button class="btn btn-outline-info btn-statut" data-id="${id}" data-statut="${statut}" title="Changer le statut"><i class="bi bi-arrow-repeat"></i></button>` : ''}
                  ${peutLivrer   ? `<button class="btn btn-success btn-livrer" data-id="${id}" title="Confirmer la livraison"><i class="bi bi-truck"></i></button>` : ''}
                  ${peutSuppr    ? `<button class="btn btn-outline-danger btn-suppr" data-id="${id}" title="Supprimer"><i class="bi bi-trash"></i></button>` : ''}
                </div>`;
            }
          },
        ],
        language: {
          emptyTable:   'Aucune commande client',
          search:       'Rechercher :',
          info:         'Affichage de _START_ à _END_ sur _TOTAL_ commande(s)',
          infoEmpty:    'Aucune commande',
          zeroRecords:  'Aucun résultat',
          lengthMenu:   'Afficher _MENU_ commandes',
          paginate:     { first: '«', last: '»', next: '›', previous: '‹' },
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

      // Événements délégués sur les boutons
      table.on('click', '.btn-detail', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        const c  = self.commandes.find(x => x.id === id);
        if (c) self.ouvrirDetail(c);
      });

      table.on('click', '.btn-statut', function(this: HTMLElement) {
        const id     = parseInt($(this).data('id'));
        const statut = $(this).data('statut');
        const c      = self.commandes.find(x => x.id === id);
        if (c) self.changerStatut({ ...c, statut });
      });

      table.on('click', '.btn-livrer', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        const c  = self.commandes.find(x => x.id === id);
        if (c) self.confirmerLivraison(c);
      });

      table.on('click', '.btn-suppr', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        const c  = self.commandes.find(x => x.id === id);
        if (c) self.supprimer(c);
      });

    } catch (e) { console.error(e); }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  statutLabel(v: string): string { return this.STATUTS.find(s => s.value === v)?.label ?? v; }
  statutCss(v: string): string   { return this.STATUTS.find(s => s.value === v)?.css   ?? 'secondary'; }

  prochainsStatuts(current: string): { value: string; label: string; css: string }[] {
    return (this.FLUX[current] ?? []).map(v => this.STATUTS.find(s => s.value === v)!).filter(Boolean);
  }

  clientNom(c: any): string {
    const cl = c.client ?? c.clientdata;
    if (!cl) return '—';
    return [cl.prenoms, cl.nom].filter(Boolean).join(' ') || '—';
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  ouvrirDetail(commande: any): void {
    this.commandeService.getById(commande.id).subscribe({
      next: (r: any) => {
        this.detailCommande = r?.data || r;
        const m = document.getElementById('modal-detail');
        if (m) new bootstrap.Modal(m).show();
      },
      error: () => this.toastr.error('Impossible de charger le détail')
    });
  }

  async changerStatut(commande: any): Promise<void> {
    const prochains = this.prochainsStatuts(commande.statut).filter(s => s.value !== 'livre');
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

    this.commandeService.changerStatut(commande.id, statut).subscribe({
      next: () => { this.toastr.success('Statut mis à jour'); this.loadCommandes(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }

  async confirmerLivraison(commande: any): Promise<void> {
    const result = await Swal.fire({
      title: 'Confirmer la livraison ?',
      html: `Une <strong>vente</strong> sera créée automatiquement et le stock sera déduit.<br><br>
             Client : <strong>${this.clientNom(commande)}</strong><br>
             Montant : <strong>${(commande.montant_total_apres_remise ?? commande.montant_total ?? 0).toLocaleString('fr-FR')} FCFA</strong>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, livrer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#198754',
    });
    if (!result.isConfirmed) return;

    this.commandeService.livrer(commande.id).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Livraison confirmée', text: 'La vente a été créée et le stock mis à jour.', timer: 2500, showConfirmButton: false });
        this.loadCommandes();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la livraison')
    });
  }

  async supprimer(commande: any): Promise<void> {
    const result = await Swal.fire({
      title: 'Supprimer la commande ?',
      text: `${this.clientNom(commande)} — ${commande.reference || '#' + commande.id}`,
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
