import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DevisService } from '../../../services/gestion-des-devis/devis.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import Swal from 'sweetalert2';

declare var $: any;
declare var bootstrap: any;

// brouillon → envoye → accepte / refuse / expire
const STATUT_MAP: Record<string, { label: string; badge: string }> = {
  brouillon: { label: 'Brouillon',  badge: 'bg-secondary' },
  envoye:    { label: 'Envoyé',     badge: 'bg-info text-dark' },
  accepte:   { label: 'Accepté',    badge: 'bg-success' },
  refuse:    { label: 'Refusé',     badge: 'bg-danger' },
  expire:    { label: 'Expiré',     badge: 'bg-warning text-dark' }
};

// Transitions autorisées par statut courant
const TRANSITIONS: Record<string, string[]> = {
  brouillon: ['envoye'],
  envoye:    ['accepte', 'refuse'],
  accepte:   [],
  refuse:    [],
  expire:    []
};

@Component({
  selector: 'app-historique-devis',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './historique-devis.component.html',
  styleUrl: './historique-devis.component.scss'
})
export default class HistoriqueDevisComponent implements OnInit, OnDestroy {
  devis: any[] = [];
  boutiques: any[] = [];
  currentUser: any;
  idBoutique = 0;
  isLoading = false;
  detailDevis: any;
  selectedDevis: any = {};
  dateDebut: string = '';
  dateFin: string = '';

  statutMap = STATUT_MAP;

  getStatutBadge(statut: string): string {
    return STATUT_MAP[statut?.toLowerCase()]?.badge || 'bg-secondary';
  }

  getStatutLabel(statut: string): string {
    return STATUT_MAP[statut?.toLowerCase()]?.label || statut;
  }

  constructor(
    private devisService: DevisService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private toastr: ToastrService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  private initDateRange(): void {
    const today = new Date();
    const debut = new Date();
    debut.setDate(today.getDate() - 30);
    this.dateFin   = today.toISOString().split('T')[0];
    this.dateDebut = debut.toISOString().split('T')[0];
  }

  onDateChange(): void {
    this.loadDevis();
  }

  ngOnInit(): void {
    this.initDateRange();
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
      this.loadDevis();
    });
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
    if (isPlatformBrowser(this.platformId)) {
      try { ($('#selectBoutique') as any).select2('destroy'); } catch {}
    }
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      ($('#selectBoutique') as any).select2({ placeholder: 'Sélectionner une boutique', allowClear: true, width: 'resolve' });
      ($('#selectBoutique') as any).on('change', () => {
        this.idBoutique = parseInt(($('#selectBoutique') as any).val());
        this.loadDevis();
      });
    }
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({ next: (r: any) => { if (r.status === 'success') this.boutiques = r.data; } });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({ next: (r: any) => { if (r.status === 'success') this.boutiques = r.data; } });
    } else {
      this.boutiques[0] = this.currentUser?.boutique;
    }
  }

  loadDevis(): void {
    this.isLoading = true;
    const code = this.currentUser?.profil?.code?.toLowerCase();
    if ((code === 'admin' || code === 'responsable_structure') && !this.idBoutique) {
      this.devis = [];
      this.isLoading = false;
      return;
    }
    const boutiqueId = this.idBoutique || this.currentUser.boutique_id;

    this.devisService.getAllDevis({
      boutique: boutiqueId, page: 1, limit: 100,
      ...(this.dateDebut && { date_debut: this.dateDebut }),
      ...(this.dateFin   && { date_fin:   this.dateFin }),
    }).subscribe({
      next: (response: any) => {

        if (Array.isArray(response)) {
          this.devis = response;
        } else if (Array.isArray(response?.data?.items)) {
          this.devis = response.data.items;
        } else if (Array.isArray(response?.data)) {
          this.devis = response.data;
        } else if (Array.isArray(response?.items)) {
          this.devis = response.items;
        } else if (Array.isArray(response?.devis)) {
          this.devis = response.devis;
        } else {
          this.devis = [];
        }


        this.destroyDataTable();
        setTimeout(() => {
          if (isPlatformBrowser(this.platformId)) {
            this.initDataTable();
            this.isLoading = false;
          }
        }, 50);
      },
      error: (err: any) => {
        console.error('[Devis] erreur chargement :', err);
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des devis');
      }
    });
  }

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('.js-dataTable-devis');
      if ($.fn.DataTable.isDataTable(t)) t.DataTable().destroy();
    } catch {}
  }

  private statutBadge(statut: string): string {
    const s = STATUT_MAP[statut?.toLowerCase()];
    return s ? `<span class="badge ${s.badge}">${s.label}</span>` : `<span class="badge bg-secondary">${statut}</span>`;
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      $('.js-dataTable-devis').DataTable({
        data: this.devis,
        columns: [
          {
            data: null,
            render: (_d: any, _t: any, row: any) => `<span class="fw-semibold">${row.reference || '—'}</span>`
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) => {
              const c = row.client ?? row.clientdata;
              return c?.nom ? `${c.nom} ${c.prenoms || ''}`.trim() : '<em class="text-muted">Sans client</em>';
            }
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) =>
              `${(row.montant_total_apres_remise || 0).toLocaleString('fr-FR')} FCFA`
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) => this.statutBadge(row.statut)
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) => {
              if (!row.date_expiration) return '—';
              const date = new Date(row.date_expiration);
              const expired = date < new Date();
              return `<span class="${expired ? 'text-danger fw-semibold' : ''}">${date.toLocaleDateString('fr-FR')}</span>`;
            }
          },
          {
            data: null,
            render: (_d: any, _t: any, row: any) =>
              row.created_at ? new Date(row.created_at).toLocaleDateString('fr-FR') : '—'
          },
          {
            data: null, className: 'text-center', width: '20%', orderable: false,
            render: (_d: any, _t: any, row: any) => {
              const transitions = TRANSITIONS[row.statut?.toLowerCase()] ?? [];
              const canConvert = row.statut?.toLowerCase() === 'accepte';
              const transitBtn = transitions.length
                ? `<button class="btn btn-sm btn-outline-secondary me-1" data-action="statut" data-id="${row.id}" title="Changer statut"><i class="bi bi-arrow-repeat"></i></button>`
                : '';
              const convertBtn = canConvert
                ? `<button class="btn btn-sm btn-primary me-1" data-action="convert" data-id="${row.id}" title="Convertir en vente"><i class="bi bi-arrow-right-circle"></i></button>`
                : '';
              return `
                <div class="btn-group">
                  <button class="btn btn-sm btn-info me-1" data-action="view" data-id="${row.id}" title="Voir"><i class="bi bi-eye"></i></button>
                  <button class="btn btn-sm btn-warning me-1" data-action="print" data-id="${row.id}" title="Imprimer"><i class="bi bi-printer"></i></button>
                  <button class="btn btn-sm btn-success me-1" data-action="edit" data-id="${row.id}" title="Modifier"><i class="bi bi-pencil-square"></i></button>
                  ${transitBtn}
                  ${convertBtn}
                  <button class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}" title="Supprimer"><i class="bi bi-trash"></i></button>
                </div>`;
            }
          }
        ],
        language: {
          emptyTable: 'Aucun devis trouvé',
          search: 'Rechercher :',
          info: 'Affichage de _START_ à _END_ sur _TOTAL_ résultat(s)',
          infoEmpty: 'Aucun résultat',
          zeroRecords: 'Aucun résultat',
          lengthMenu: 'Afficher _MENU_ éléments',
          paginate: { first: '«', last: '»', next: '›', previous: '‹' },
        },
        dom: '<"row mb-2"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
        buttons: [
          { extend: 'excel', text: '<i class="bi bi-file-earmark-excel"></i> Excel', className: 'btn btn-success btn-sm me-1' },
          { extend: 'pdf', text: '<i class="bi bi-file-earmark-pdf"></i> PDF', className: 'btn btn-danger btn-sm' }
        ],
        order: [[5, 'desc']],
        pageLength: 20, responsive: true, ordering: true, autoWidth: false,
        createdRow: (row: any) => {
          $(row).find('[data-action]').on('click', (e: any) => {
            const btn = $(e.currentTarget);
            const d = this.devis.find((v: any) => v.id === btn.data('id'));
            if (!d) return;
            switch (btn.data('action')) {
              case 'view':    this.viewDetails(d);       break;
              case 'print':   this.printDevis(d);        break;
              case 'edit':    this.editDevis(d);          break;
              case 'statut':  this.promptChangerStatut(d); break;
              case 'convert': this.convertirEnVente(d);  break;
              case 'delete':  this.deleteDevis(d);        break;
            }
          });
        }
      });
    } catch {}
  }

  viewDetails(devis: any): void {
    this.selectedDevis = devis;
    this.devisService.getDetailDevis(devis.id).subscribe({
      next: (r: any) => {
        this.detailDevis = Array.isArray(r) ? r : (r.data ?? r);
        const modal = document.getElementById('modal-devis-detail');
        if (modal) new bootstrap.Modal(modal).show();
      },
      error: () => this.toastr.error('Erreur lors du chargement des détails')
    });
  }

  get isPos(): boolean {
    return this.router.url.startsWith('/pos');
  }

  editDevis(devis: any): void {
    this.isLoading = true;
    this.devisService.getDetailDevis(devis.id).subscribe({
      next: (r: any) => {
        const data = Array.isArray(r) ? r : (r.data ?? r);
        localStorage.setItem('editDevisData', JSON.stringify({ id: devis.id, devis: data }));
        this.router.navigate([this.isPos ? '/pos/devis/nouveau' : '/gestion-des-devis/nouveau']);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; this.toastr.error('Erreur lors du chargement du devis'); }
    });
  }

  printDevis(devis: any): void {
    this.isLoading = true;
    this.devisService.imprimerDevis(devis.id).subscribe({
      next: (r: any) => { this.isLoading = false; window.open(r.path, '_blank'); },
      error: () => { this.isLoading = false; this.toastr.error('Erreur lors de la génération du PDF'); }
    });
  }

  promptChangerStatut(devis: any): void {
    const transitions = TRANSITIONS[devis.statut?.toLowerCase()] ?? [];
    if (!transitions.length) return;

    const options = transitions.map(s => {
      const info = STATUT_MAP[s];
      return `<option value="${s}">${info?.label ?? s}</option>`;
    }).join('');

    Swal.fire({
      title: 'Changer le statut',
      html: `
        <p class="mb-2">Statut actuel : <strong>${STATUT_MAP[devis.statut?.toLowerCase()]?.label ?? devis.statut}</strong></p>
        <select id="swal-statut" class="swal2-input" style="width:100%">
          ${options}
        </select>`,
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
      preConfirm: () => (document.getElementById('swal-statut') as HTMLSelectElement)?.value
    }).then(result => {
      if (result.isConfirmed && result.value) {
        this.devisService.changerStatut(devis.id, result.value).subscribe({
          next: () => {
            this.toastr.success(`Statut mis à jour : ${STATUT_MAP[result.value]?.label}`);
            this.loadDevis();
          },
          error: () => this.toastr.error('Erreur lors du changement de statut')
        });
      }
    });
  }

  convertirEnVente(devis: any): void {
    if (devis.statut?.toLowerCase() !== 'accepte') {
      Swal.fire({ icon: 'warning', title: 'Conversion impossible', text: 'Le devis doit être au statut "Accepté" pour être converti en vente.' });
      return;
    }

    Swal.fire({
      title: 'Convertir en vente ?',
      text: `Le devis "${devis.reference}" sera converti en vente et le stock sera déduit. Cette action est irréversible.`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#198754', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, convertir', cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.devisService.convertirEnVente(devis.id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Devis converti en vente avec succès', timer: 2000, showConfirmButton: false });
            this.loadDevis();
          },
          error: () => {
            this.toastr.error('Erreur lors de la conversion');
            this.isLoading = false;
          }
        });
      }
    });
  }

  deleteDevis(devis: any): void {
    Swal.fire({
      text: `Voulez-vous vraiment supprimer le devis "${devis.reference}" ?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer', cancelButtonText: 'Annuler'
    }).then(result => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.devisService.deleteDevis(devis.id).subscribe({
          next: () => { this.toastr.success('Devis supprimé avec succès'); this.loadDevis(); },
          error: () => { this.toastr.error('Erreur lors de la suppression'); this.isLoading = false; }
        });
      }
    });
  }
}
