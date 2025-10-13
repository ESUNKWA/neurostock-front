import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategorieService } from '../../../services/gestion-des-produits/categorie.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { isPlatformBrowser } from '@angular/common';
import { first } from 'rxjs';
import Swal, { SweetAlertResult } from 'sweetalert2';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-categorie',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './categorie.component.html',
  styleUrl: './categorie.component.scss',
  providers: [ToastrService]
})
export default class CategorieComponent implements OnInit, OnDestroy {
  categories: any = [];
  isLoading: boolean = false;
  isEditMode: boolean = false;
  selectedCategorie: any = null;
  titleModal: string = 'AJOUTER UNE CATEGORIE';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';
  categorieForm: FormGroup;
  isSubmitted: boolean = false;
  
  constructor(
    private fb: FormBuilder, 
    private categorieService: CategorieService, 
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.categorieForm = this.fb.group({
      nom: ['', [Validators.required]],
      description: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Initialiser les données
    this.loadCategories();
    
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
  get f() { return this.categorieForm.controls; }

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
          data: this.categories,
          columns: [
            { 
              data: 'nom',
              render: (data: any) => `<span class="fw-semibold">${data.toUpperCase() || ''}</span>` 
            },
            { 
              data: 'description',
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
              const categorie = this.categories.find((c: any) => c.id === id);
              
              if (!categorie) return;
              
              switch (action) {
                case 'view':
                  this.openViewCategorie(categorie);
                  break;
                case 'edit':
                  this.openEditCategorie(categorie);
                  break;
                case 'delete':
                  this.deleteCategorie(categorie);
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

  /**
   * Recharge les données et rafraîchit le tableau
   */
  loadCategories(): void {
    this.isLoading = true;
    
    this.categorieService.getAllCategories().subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          // Mise à jour des données
          this.categories = response.data;
          
          // D'abord, détruisons l'instance DataTable sans vider la table
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
        this.toastr.error('Erreur lors du chargement des catégories');
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
    this.selectedCategorie = null;
    const title = 'Ajouter une catégorie';
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.categorieForm.reset();
    this.isSubmitted = false;

    // Activer les champs du formulaire
    this.categorieForm.get('nom')?.enable();
    this.categorieForm.get('description')?.enable();
  }

  openViewCategorie(categorie: any): void {
    this.selectedCategorie = categorie;
    const title = `Visualiser la catégorie [${categorie?.nom}]`;
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Fermer';
    this.icon = 'ri ri-close-circle-line';
    this.categorieForm.reset();
    this.isSubmitted = false;

    // Remplir le formulaire en lecture seule
    this.categorieForm.patchValue({
      nom: categorie.nom,
      description: categorie.description || ''
    });

    // Désactiver les champs du formulaire
    this.categorieForm.get('nom')?.disable();
    this.categorieForm.get('description')?.disable();

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  openEditCategorie(categorie: any): void {
    this.isEditMode = !!categorie;
    this.selectedCategorie = categorie || null;
    this.buttonText = this.isEditMode ? 'Modifier' : 'Enregistrer';
    this.icon = this.isEditMode ? 'bi bi-pencil-square' : 'ri ri-save-3-line';
    const title = `Modifier la catégorie [${categorie?.nom}]`;
    const defaultTitle = 'Ajouter une catégorie';
    this.titleModal = this.isEditMode ? title.toUpperCase() : defaultTitle.toUpperCase();

    // Activer les champs du formulaire
    this.categorieForm.get('nom')?.enable();
    this.categorieForm.get('description')?.enable();

    if (this.isEditMode && categorie) {
      // Remplir le formulaire avec les données de la catégorie
      this.categorieForm.patchValue({
        nom: categorie.nom,
        description: categorie.description || ''
      });
    } else {
      // Réinitialiser le formulaire pour une nouvelle catégorie
      this.categorieForm.reset();
    }

    this.isSubmitted = false;

    // Ouvrir le modal
    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  saveOrUpdateCategorie(): void {
    this.isSubmitted = true;

    // arrêter ici si le formulaire est invalide
    if (this.categorieForm.invalid) {
      return;
    }

    let request;
    const categorie = this.categorieForm.value;
    if (this.isEditMode && this.selectedCategorie) {
      // Mode modification
      request = this.categorieService.updateCategorie(this.selectedCategorie.id, categorie);
    } else {
      // Mode création
      request = this.categorieService.createCategorie(categorie);
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
            'Catégorie modifiée avec succès' : 
            'Catégorie ajoutée avec succès');

          // Recharger les données sans détruire complètement le tableau
          this.loadCategories();

          // Réinitialiser le formulaire et les états
          this.categorieForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.selectedCategorie = null;
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

  deleteCategorie(categorie: any): void {
    Swal.fire({
      text: `Voulez-vous vraiment supprimer la catégorie "${categorie.nom}" ?`,
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
        
        this.categorieService.deleteCategorie(categorie.id).pipe(first()).subscribe({
          next: (response: any) => {
            if (response.affected === 1) {
              this.toastr.success('La catégorie a été supprimée avec succès.');
              // Recharger les données sans détruire complètement le tableau
              this.loadCategories();
            } else {
              this.toastr.error('La catégorie n\'a pas pu être supprimée.');
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
