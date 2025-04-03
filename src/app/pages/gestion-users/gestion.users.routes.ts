import { Routes } from "@angular/router"
import { ProfilComponent } from "./profil/profil.component";
import { UsersComponent } from "./users/users.component";

export const UsersRoutes: Routes = [
    {path: "",redirectTo: "utilisateur",pathMatch: "full",},
    {path: 'profil', component: ProfilComponent},
    {path: 'utilisateur', component: UsersComponent},
];