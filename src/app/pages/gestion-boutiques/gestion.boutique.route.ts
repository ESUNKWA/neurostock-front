import { Routes } from "@angular/router";
import { StructureComponent } from "./structure/structure.component";
import { BoutiqueComponent } from "./boutique/boutique.component";

export const boutiqueRoute: Routes = [
    {path: '', pathMatch: 'full', redirectTo: 'list'},
    {path: 'list', component: StructureComponent},
    {path: 'boutiques', component: BoutiqueComponent},
]; 