import { Routes } from "@angular/router"
import { ProfilComponent } from "./profil/profil.component";
import { UsersComponent } from "./users/users.component";

export const UsersRoutes: Routes = [
    {path: "",redirectTo: "list",pathMatch: "full",},
    {path: 'list', component: UsersComponent},
    {path: 'profils', component: ProfilComponent},
];