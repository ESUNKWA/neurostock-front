import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategorieService } from '../../../services/gestion-des-produits/categorie.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

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
export default class CategorieComponent implements OnInit, AfterViewInit {
  @ViewChild('dataTable') dataTable!: ElementRef;
  
  categorieForm: FormGroup;
  categories: any[] = [];
  isEditing = false;
  selectedId: number | null = null;
  private categorieModal: any;
  private deleteModal: any;
  private categorieToDelete: number | null = null;

  constructor(
    private fb: FormBuilder,
    private categorieService: CategorieService,
    private toastr: ToastrService
  ) {
    this.categorieForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit() {
    this.loadCategories();
  }

  ngAfterViewInit() {
    this.initializeDataTable();
    this.initializeModals();
  }

  private initializeModals() {
    this.categorieModal = new bootstrap.Modal(document.getElementById('categorieModal'));
    this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
  }

  private initializeDataTable() {
    $(this.dataTable.nativeElement).DataTable({
      language: {
        emptyTable: "Aucune donnée disponible dans le tableau",
        info: "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
        infoEmpty: "Affichage de 0 à 0 sur 0 entrée",
        infoFiltered: "(filtré de _MAX_ entrées au total)",
        infoThousands: ",",
        loadingRecords: "Chargement...",
        processing: "Traitement...",
        search: "Rechercher :",
        zeroRecords: "Aucun élément correspondant trouvé",
        paginate: {
          first: "Premier",
          last: "Dernier",
          next: "Suivant",
          previous: "Précédent"
        },
        aria: {
          sortAscending: ": activer pour trier la colonne par ordre croissant",
          sortDescending: ": activer pour trier la colonne par ordre décroissant"
        },
        select: {
          rows: {
            _: "%d lignes sélectionnées",
            1: "1 ligne sélectionnée"
          }
        }
      },
      dom: '<"row"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>>' +
           '<"row"<"col-sm-12"tr>>' +
           '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      pageLength: 10,
      buttons: [
        {
          extend: 'collection',
          text: 'Exporter',
          buttons: [
            'excel',
            'pdf',
            'print'
          ]
        }
      ],
      data: this.categories,
      columns: [
        { data: 'id' },
        { data: 'nom' },
        { data: 'description' },
        {
          data: null,
          render: (data: any) => `
            <div class="d-flex justify-content-center">
              <button class="btn btn-sm btn-primary me-2" onclick="editCategorie(${data.id})">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteCategorie(${data.id})">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          `
        }
      ],
      responsive: true,
      autoWidth: false,
      fixedHeader: true,
      order: [[0, 'desc']]
    });
  }

  loadCategories() {
    this.categorieService.getAllCategories().subscribe({
      next: (data: any) => {
        this.categories = data;
        console.log('categories', this.categories);
        
        if ($.fn.DataTable.isDataTable(this.dataTable.nativeElement)) {
          $(this.dataTable.nativeElement).DataTable().destroy();
        }
        this.initializeDataTable();
      },
      error: (error) => {
        // console.log('error', error);
        this.toastr.error('Erreur lors du chargement des catégories');
      }
    });
  }

  openAddModal() {
    this.isEditing = false;
    this.selectedId = null;
    this.categorieForm.reset();
    this.categorieModal.show();
  }

  onSubmit() {
    if (this.categorieForm.valid) {
      const categorie = this.categorieForm.value;
      if (this.isEditing && this.selectedId) {
        this.categorieService.updateCategorie(this.selectedId, categorie).subscribe({
          next: () => {
            this.toastr.success('Catégorie mise à jour avec succès');
            this.categorieModal.hide();
            this.loadCategories();
          },
          error: (error) => {
            this.toastr.error('Erreur lors de la mise à jour de la catégorie');
          }
        });
      } else {
        this.categorieService.createCategorie(categorie).subscribe({
          next: () => {
            this.toastr.success('Catégorie créée avec succès');
            this.categorieModal.hide();
            this.loadCategories();
          },
          error: (error) => {
            this.toastr.error('Erreur lors de la création de la catégorie');
          }
        });
      }
    } else {
      Object.keys(this.categorieForm.controls).forEach(key => {
        const control = this.categorieForm.get(key);
        if (control?.errors) {
          control.markAsTouched();
        }
      });
    }
  }

  editCategorie(id: number) {
    this.isEditing = true;
    this.selectedId = id;
    this.categorieService.getCategorieById(id).subscribe({
      next: (categorie: any) => {
        this.categorieForm.patchValue(categorie);
        this.categorieModal.show();
      },
      error: (error) => {
        this.toastr.error('Erreur lors du chargement de la catégorie');
      }
    });
  }

  deleteCategorie(id: number) {
    this.categorieToDelete = id;
    this.deleteModal.show();
  }

  confirmDelete() {
    if (this.categorieToDelete) {
      this.categorieService.deleteCategorie(this.categorieToDelete).subscribe({
        next: () => {
          this.toastr.success('Catégorie supprimée avec succès');
          this.deleteModal.hide();
          this.loadCategories();
        },
        error: (error) => {
          this.toastr.error('Erreur lors de la suppression de la catégorie');
        }
      });
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.categorieForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    if (control?.hasError('minlength')) {
      return `La longueur minimale est de ${control.errors?.['minlength'].requiredLength} caractères`;
    }
    return '';
  }
}
