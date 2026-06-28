import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { first } from 'rxjs';
import Swal, { SweetAlertResult } from 'sweetalert2';
import { AuthService } from '../../../services/auth/auth.service';
import { ClientService } from '../../../services/gestion-des-clients/client.service';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export default class ClientsComponent implements OnInit, OnDestroy {
  clients: any[] = [];
  isLoading = false;
  isEditMode = false;
  isSubmitted = false;
  selectedClient: any = null;
  titleModal = 'AJOUTER UN CLIENT';
  buttonText = 'Enregistrer';
  icon = 'ri ri-save-3-line';
  clientForm: FormGroup;
  currentUser: any;

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private authService: AuthService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.clientForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: [''],
      telephone: ['', Validators.required],
      email: ['', [Validators.email]],
      adresse: [''],
    });
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadClients();
    });
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
  }

  get f() { return this.clientForm.controls; }

  loadClients(): void {
    if (!this.currentUser) return;
    this.isLoading = true;
    const boutiqueId = this.currentUser.boutique?.id;
    if (!boutiqueId) { this.isLoading = false; return; }

    this.clientService.getClientsByBoutique(boutiqueId).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.clients = response.data;
          this.destroyDataTable();
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) {
              this.initDataTable();
              this.isLoading = false;
            }
          }, 50);
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des clients');
      }
    });
  }

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const table = $('.js-dataTable-buttons');
      if ($.fn.DataTable.isDataTable(table)) table.DataTable().destroy();
    } catch {}
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      $('.js-dataTable-buttons').DataTable({
        data: this.clients,
        columns: [
          { data: 'nom', render: (d: any) => `<span class="fw-semibold">${(d || '').toUpperCase()}</span>` },
          { data: 'prenom', render: (d: any) => d || '—' },
          { data: 'telephone', render: (d: any) => d || '—' },
          { data: 'email', render: (d: any) => d || '—' },
          { data: 'adresse', render: (d: any) => d || '—' },
          {
            data: null, className: 'text-center', width: '12%', orderable: false,
            render: (_d: any, _t: any, row: any) => `
              <div class="btn-group">
                <button class="btn btn-sm btn-info me-1" data-action="view" data-id="${row.id}" title="Voir"><i class="bi bi-eye"></i></button>
                <button class="btn btn-sm btn-success me-1" data-action="edit" data-id="${row.id}" title="Modifier"><i class="bi bi-pencil-square"></i></button>
                <button class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}" title="Supprimer"><i class="bi bi-trash"></i></button>
              </div>`
          }
        ],
        language: {
          emptyTable: 'Aucun client enregistré',
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
        pageLength: 20, responsive: true, ordering: true, autoWidth: false,
        createdRow: (row: any, _data: any) => {
          $(row).find('[data-action]').on('click', (e: any) => {
            const btn = $(e.currentTarget);
            const client = this.clients.find((c: any) => c.id === btn.data('id'));
            if (!client) return;
            switch (btn.data('action')) {
              case 'view': this.openView(client); break;
              case 'edit': this.openEdit(client); break;
              case 'delete': this.delete(client); break;
            }
          });
        }
      });
    } catch {}
  }

  openNew(): void {
    this.isEditMode = false;
    this.selectedClient = null;
    this.titleModal = 'AJOUTER UN CLIENT';
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.clientForm.reset();
    this.isSubmitted = false;
    Object.values(this.clientForm.controls).forEach(c => c.enable());
  }

  openView(client: any): void {
    this.selectedClient = client;
    this.titleModal = `VISUALISER LE CLIENT [${client.nom}]`;
    this.buttonText = 'Fermer';
    this.clientForm.patchValue(client);
    Object.values(this.clientForm.controls).forEach(c => c.disable());
    this.showModal();
  }

  openEdit(client: any): void {
    this.isEditMode = true;
    this.selectedClient = client;
    this.titleModal = `MODIFIER LE CLIENT [${client.nom}]`;
    this.buttonText = 'Modifier';
    this.icon = 'bi bi-pencil-square';
    this.isSubmitted = false;
    this.clientForm.patchValue(client);
    Object.values(this.clientForm.controls).forEach(c => c.enable());
    this.showModal();
  }

  private showModal(): void {
    const modal = document.getElementById('modal-client');
    if (modal) new bootstrap.Modal(modal).show();
  }

  saveOrUpdate(): void {
    this.isSubmitted = true;
    if (this.clientForm.invalid) return;

    const body = { ...this.clientForm.value, boutique: this.currentUser.boutique.id };
    const request = this.isEditMode
      ? this.clientService.updateClient(this.selectedClient.id, body)
      : this.clientService.addClient(body);

    this.isLoading = true;
    request.pipe(first()).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          this.toastr.success(this.isEditMode ? 'Client modifié avec succès' : 'Client ajouté avec succès');
          const modal = document.getElementById('modal-client');
          if (modal) bootstrap.Modal.getInstance(modal)?.hide();
          this.clientForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.selectedClient = null;
          this.loadClients();
        } else {
          this.toastr.error('Une erreur est survenue');
          this.isLoading = false;
        }
      },
      error: () => {
        this.toastr.error('Une erreur est survenue lors de la sauvegarde');
        this.isLoading = false;
      }
    });
  }

  delete(client: any): void {
    Swal.fire({
      text: `Voulez-vous vraiment supprimer le client "${client.nom}" ?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer', cancelButtonText: 'Annuler'
    }).then((result: SweetAlertResult) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.clientService.deleteClient(client.id).pipe(first()).subscribe({
          next: () => {
            this.toastr.success('Client supprimé avec succès');
            this.loadClients();
          },
          error: () => {
            this.toastr.error('Erreur lors de la suppression');
            this.isLoading = false;
          }
        });
      }
    });
  }
}
