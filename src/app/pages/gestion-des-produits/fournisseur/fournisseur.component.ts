import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { FournisseurService } from '../../../services/gestion-des-produits/fournisseur.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { first } from 'rxjs';
import Swal, { SweetAlertResult } from 'sweetalert2';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-fournisseur',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './fournisseur.component.html',
  styleUrl: './fournisseur.component.scss'
})
export default class FournisseurComponent implements OnInit, OnDestroy {
  fournisseurs: any[] = [];
  isLoading: boolean = false;
  isEditMode: boolean = false;
  selectedFournisseur: any = null;
  titleModal: string = 'AJOUTER UN FOURNISSEUR';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';
  fournisseurForm: FormGroup;
  isSubmitted: boolean = false;

  constructor(
    private fb: FormBuilder,
    private fournisseurService: FournisseurService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.fournisseurForm = this.fb.group({
      nom: ['', Validators.required],
      addresse_geo: ['', Validators.required],
      contact: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      interlocuteur: ['', Validators.required],
      contact_interlocuteur: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadFournisseurs();

    // Configurer les tooltips pour qu'ils se réinitialisent correctement
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip({
          trigger: 'hover'
        });
      }, 500);
    }
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.fournisseurForm.controls; }

  /**
   * Détruit l'instance DataTable existante
   */
  private destroyDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const table = $('.js-dataTable-buttons');
        if ($.fn.DataTable.isDataTable(table)) {
          table.DataTable().destroy();
          // Ne pas vider la table pour conserver les en-têtes
        }
      } catch (error) {
        console.error('Erreur lors de la destruction de DataTable:', error);
      }
    }
  }

  /**
   * Initialise une instance DataTable
   */
  private initDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        $('.js-dataTable-buttons').DataTable({
          data: this.fournisseurs,
          columns: [
            { 
              data: 'nom',
              render: (data: any) => `<span class="fw-semibold">${data.toUpperCase() || ''}</span>` 
            },
            { 
              data: 'addresse_geo',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data || 'Non définie' 
            },
            {
              data: 'contact',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data.toUpperCase() || 'Non définie' 
            },
            { 
              data: 'email',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data || 'Non définie' 
            },
            {
              data: 'interlocuteur',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data.toUpperCase() || 'Non définie' 
            },
            {
              data: 'contact_interlocuteur',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data.toUpperCase() || 'Non définie' 
            },
            { 
              data: 'created_at',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => {
                if (!data) return '';
                const date = new Date(data);
                return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
              }
            },
            { 
              data: null,
              className: 'text-center',
              width: '15%',
              orderable: false,
              render: (data: any, type: any, row: any) => {
                return `
                  <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-info me-2" data-bs-toggle="tooltip" title="visualiser" data-action="view" data-id="${row.id}">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-success me-2" data-bs-toggle="tooltip" title="Modifier" data-action="edit" data-id="${row.id}">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" data-bs-toggle="tooltip" title="Supprimer" data-action="delete" data-id="${row.id}">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                `;
              }
            }
          ],
          language: {
            emptyTable: "Aucune donnée",
            info: "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
            infoEmpty: "Affichage de 0 à 0 sur 0 entrée",
            infoFiltered: "(filtré de _MAX_ entrées au total)",
            infoThousands: ",",
            loadingRecords: "Chargement...",
            processing: "Traitement...",
            search: "Rechercher :",
            zeroRecords: "Aucun enregistrement trouvé",
            paginate: {
              first: '<i class="bi bi-chevron-double-left"></i>',
              last: '<i class="bi bi-chevron-double-right"></i>',
              next: '<i class="bi bi-chevron-right"></i>',
              previous: '<i class="bi bi-chevron-left"></i>'
            }
          },
          dom: '<"row"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>>' +
               '<"row"<"col-sm-12"tr>>' +
               '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
          buttons: [
            {
              extend: 'excel',
              text: '<i class="bi bi-file-earmark-excel"></i> Excel',
              className: 'btn btn-success btn-sm me-2',
              exportOptions: {
                columns: [0, 1, 2] // Exporter uniquement les colonnes Nom, Description et Date
              }
            },
            {
              extend: 'pdf',
              text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
              className: 'btn btn-danger btn-sm',
              exportOptions: {
                columns: [0, 1, 2] // Exporter uniquement les colonnes Nom, Description et Date
              }
            }
          ],
          pageLength: 5,
          searching: true,
          info: true,
          responsive: true,
          ordering: true,
          pagingType: 'full_numbers',
          stateSave: false,
          retrieve: false,
          autoWidth: false,
          drawCallback: () => {
            $('[data-bs-toggle="tooltip"]').tooltip();
          },
          createdRow: (row: any, data: any, dataIndex: any) => {
            $(row).find('[data-action]').on('click', (e: any) => {
              const button = $(e.currentTarget);
              const action = button.data('action');
              const id = button.data('id');
              const fournisseur = this.fournisseurs.find((c: any) => c.id === id);
              
              if (!fournisseur) return;
              
              switch (action) {
                case 'view':
                  this.openViewFournisseur(fournisseur);
                  break;
                case 'edit':
                  this.openEditFournisseur(fournisseur);
                  break;
                case 'delete':
                  this.deleteFournisseur(fournisseur);
                  break;
              }
            });
          }
        });
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de DataTable:', error);
      }
    }
  }

  loadFournisseurs(): void {
    this.isLoading = true;

    this.fournisseurService.getAllFournisseurs().subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.fournisseurs = response.data;
          this.destroyDataTable();

          // Donner le temps au DOM de se mettre à jour
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) {
              try {
                // Réinitialiser le tableau avec les nouvelles données
                this.initDataTable();
              } catch (error) {
                console.error('Erreur lors de la réinitialisation de DataTable:', error);
              }
              this.isLoading = false;
            }
          }, 50); // Temps d'attente réduit pour une mise à jour plus rapide
        } else {
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des fournisseurs');
      }
    });
  }

  /**
   * Rafraîchit uniquement le tableau sans recharger les données
   */
  refreshDataTable(): void {
    this.destroyDataTable();
    this.initDataTable();
  }

  openNewModal(): void {
    this.isEditMode = false;
    this.selectedFournisseur = null;
    const title = 'Ajouter un fournisseur';
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.fournisseurForm.reset();
    this.isSubmitted = false;

    // Activer les champs du formulaire
    this.fournisseurForm.get('nom')?.enable();
    this.fournisseurForm.get('addresse_geo')?.enable();
    this.fournisseurForm.get('contact')?.enable();
    this.fournisseurForm.get('email')?.enable();
    this.fournisseurForm.get('interlocuteur')?.enable();
    this.fournisseurForm.get('contact_interlocuteur')?.enable();
  }

  openViewFournisseur(fournisseur: any): void {
    this.selectedFournisseur = fournisseur;
    const title = `Visualiser le fournisseur [${fournisseur?.nom}]`;
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Fermer';
    this.icon = 'ri ri-close-circle-line';
    this.fournisseurForm.reset();
    this.isSubmitted = false;

    // Remplir le formulaire en lecture seule
    this.fournisseurForm.patchValue({
      nom: fournisseur.nom,
      addresse_geo: fournisseur.addresse_geo || '',
      contact: fournisseur.contact || '',
      email: fournisseur.email || '',
      interlocuteur: fournisseur.interlocuteur || '',
      contact_interlocuteur: fournisseur.contact_interlocuteur || ''
    });

    // Désactiver les champs du formulaire
    this.fournisseurForm.get('nom')?.disable();
    this.fournisseurForm.get('addresse_geo')?.disable();
    this.fournisseurForm.get('contact')?.disable();
    this.fournisseurForm.get('email')?.disable();
    this.fournisseurForm.get('interlocuteur')?.disable();
    this.fournisseurForm.get('contact_interlocuteur')?.disable();

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  openEditFournisseur(fournisseur: any): void {
    this.isEditMode = !!fournisseur;
    this.selectedFournisseur = fournisseur || null;
    this.buttonText = this.isEditMode ? 'Modifier' : 'Enregistrer';
    this.icon = this.isEditMode ? 'bi bi-pencil-square' : 'ri ri-save-3-line';
    const title = `Modifier le fournisseur [${fournisseur?.nom}]`;
    const defaultTitle = 'Ajouter un fournisseur';
    this.titleModal = this.isEditMode ? title.toUpperCase() : defaultTitle.toUpperCase();

    // Activer les champs du formulaire
    this.fournisseurForm.get('nom')?.enable();
    this.fournisseurForm.get('addresse_geo')?.enable();
    this.fournisseurForm.get('contact')?.enable();
    this.fournisseurForm.get('email')?.enable();
    this.fournisseurForm.get('interlocuteur')?.enable();
    this.fournisseurForm.get('contact_interlocuteur')?.enable();

    if (this.isEditMode && fournisseur) {
      // Remplir le formulaire avec les données du fournisseur
      this.fournisseurForm.patchValue({
        nom: fournisseur.nom,
        addresse_geo: fournisseur.addresse_geo || '',
        contact: fournisseur.contact || '',
        email: fournisseur.email || '',
        interlocuteur: fournisseur.interlocuteur || '',
        contact_interlocuteur: fournisseur.contact_interlocuteur || ''
      });
    } else {
      // Réinitialiser le formulaire pour un nouveau fournisseur
      this.fournisseurForm.reset();
    }

    this.isSubmitted = false;

    // Ouvrir le modal
    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  saveOrUpdateFournisseur(): void {
    this.isSubmitted = true;

    if (this.fournisseurForm.invalid) {
      return;
    }

    let request;
    const fournisseur = this.fournisseurForm.value;
    if (this.isEditMode && this.selectedFournisseur) {
      // Mode modification
      request = this.fournisseurService.updateFournisseur(this.selectedFournisseur.id, fournisseur);
    } else {
      // Mode création
      request = this.fournisseurService.addFournisseur(fournisseur);
    }

    // Afficher l'indicateur de chargement sans masquer le tableau
    this.isLoading = true;

    request.pipe(first()).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          // Fermer le modal
          const modal = document.getElementById('modal-fadein');
          if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
              modalInstance.hide();
            } 
          }

          this.toastr.success(this.isEditMode ? 
            'Fournisseur modifié avec succès' : 
            'Fournisseur ajouté avec succès');

          // Recharger les données sans détruire complètement le tableau
          this.loadFournisseurs();

          // Réinitialiser le formulaire et les états
          this.fournisseurForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.selectedFournisseur = null;
        } else {
          this.isLoading = false;
          this.toastr.error('Une erreur est survenue lors de la sauvegarde');
        }
      },
      error: (error: any) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.toastr.error('Une erreur est survenue lors de la sauvegarde');
        this.isLoading = false;
      }
    });
  }

  deleteFournisseur(fournisseur: any): void {
    Swal.fire({
      text: `Voulez-vous vraiment supprimer le fournisseur "${fournisseur.nom}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#5C636A',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result: SweetAlertResult) => {
      if (result.isConfirmed) {
        // Afficher l'indicateur de chargement sans masquer le tableau
        this.isLoading = true;
        
        this.fournisseurService.deleteFournisseur(fournisseur.id).pipe(first()).subscribe({
          next: (response: any) => {
            if (response.affected === 1) {
              this.toastr.success('Le fournisseur a été supprimé avec succès.');
              // Recharger les données sans détruire complètement le tableau
              this.loadFournisseurs();
            } else {
              this.toastr.error('Le fournisseur n\'a pas pu être supprimé.');
              this.isLoading = false;
            }
          },
          error: (error: any) => {
            console.error('Erreur lors de la suppression:', error);
            this.toastr.error('Une erreur est survenue lors de la suppression.');
            this.isLoading = false;
          }
        });
      }
    });
  }

}
