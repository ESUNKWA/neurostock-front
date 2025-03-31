import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategorieService } from '../../../services/gestion-des-produits/categorie.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { isPlatformBrowser } from '@angular/common';
import { first } from 'rxjs';

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
export default class CategorieComponent implements OnInit {
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
    this.loadCategories();
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.categorieForm.controls; }

  loadCategories(): void {
    this.isLoading = true;
    this.categorieService.getAllCategories().subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.categories = response.data;
          // Attendre que le DOM soit mis à jour
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) {
              const $ = (window as any).$;
              if ($ && $.fn.dataTable) {
                try {
                  // Détruire l'instance existante si elle existe
                  const existingTable = $('.js-dataTable-buttons').DataTable();
                  if (existingTable) {
                    existingTable.destroy();
                  }
                  
                  // Initialiser une nouvelle instance
                  $('.js-dataTable-buttons').DataTable({
                    language: {
                      emptyTable: "Aucune donnée",
                      info: "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
                      infoEmpty: "Affichage de 0 à 0 sur 0 entrée",
                      infoFiltered: "(filtré de _MAX_ entrées au total)",
                      infoThousands: ",",
                      lengthMenu: "Afficher _MENU_ entrées",
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
                    dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                         '<"row"<"col-sm-12"tr>>' +
                         '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
                    pageLength: 5,
                    searching: true,
                    info: true,
                    lengthChange: true,
                    responsive: true,
                    pagingType: 'full_numbers'
                  });
                } catch (error) {
                  console.error('Erreur lors de l\'initialisation de DataTable:', error);
                }
              }
            }
          }, 100);
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des catégories');
      }
    });
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

    // Désactiver les champs du formulaire
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
      const modalInstance = new (window as any).bootstrap.Modal(modal);
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

    // Désactiver les champs du formulaire
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
      const modalInstance = new (window as any).bootstrap.Modal(modal);
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

    request.subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          // Fermer le modal
          if (this.isEditMode) {
            const modal = document.getElementById('modal-fadein');
            if (modal) {
              const modalInstance = (window as any).bootstrap.Modal.getInstance(modal);
              if (modalInstance) {
                modalInstance.hide();
              } 
            }
          }

          this.toastr.success(this.isEditMode ? 
            'Catégorie modifiée avec succès' : 
            'Catégorie ajoutée avec succès');

          // Afficher la notification
          // if (isPlatformBrowser(this.platformId)) {
          //   const $ = (window as any).$;
          //   if ($) {
          //     $.notify({
          //       icon: 'ri ri-check-line me-1',
          //       message: this.isEditMode ? 
          //         'La catégorie a été modifiée avec succès' : 
          //         'La catégorie a été ajoutée avec succès'
          //     }, {
          //       type: 'success',
          //       placement: {
          //         from: 'top',
          //         align: 'right'
          //       },
          //       delay: 3000,
          //       z_index: 9999,
          //       animate: {
          //         enter: 'animated fadeInDown',
          //         exit: 'animated fadeOutUp'
          //       }
          //     });
          //   }
          // }

          // Recharger la liste des catégories
          this.loadCategories();

          // Réinitialiser le formulaire et les états
          this.categorieForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.selectedCategorie = null;
        }
      },
      error: (error: any) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.toastr.error('Une erreur est survenue lors de la sauvegarde');
        
        // Afficher une notification d'erreur
        // if (isPlatformBrowser(this.platformId)) {
        //   const $ = (window as any).$;
        //   if ($) {
        //     $.notify({
        //       icon: 'ri ri-close-circle-line me-1',
        //       message: 'Une erreur est survenue lors de la sauvegarde'
        //     }, {
        //       type: 'danger',
        //       placement: {
        //         from: 'top',
        //         align: 'right'
        //       },
        //       delay: 3000,
        //       z_index: 9999,
        //       animate: {
        //         enter: 'animated fadeInDown',
        //         exit: 'animated fadeOutUp'
        //       }
        //     });
        //   }
        // }
      }
    });
  }

}
