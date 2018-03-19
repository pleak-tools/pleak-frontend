import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { ModelerComponent } from './modeler/modeler.component';
import { ViewerComponent } from './viewer/viewer.component';
import { WorkspaceComponent } from './workspace/workspace.component';
import { FilesComponent } from './workspace/pages/files.component';
import { FileListItemComponent } from './workspace/templates/file-list-item.component';
import { OwnFilesComponent } from './workspace/templates/ownFiles.component';
import { SharedFilesComponent } from './workspace/templates/sharedFiles.component';
import { MovePobjectsComponent } from './workspace/templates/move.component';
import { PublishFolderFormComponent } from './workspace/forms/publish-folder-form.component';

import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { ApiService } from './api.service';

import { RouterModule, Routes } from '@angular/router';
import { RouteService } from 'app/route/route.service';


const appRoutes: Routes = [
  {
    path: '',
    component: WorkspaceComponent
  },
  {
    path: '**',
    component: WorkspaceComponent
  }
];

@NgModule({
  declarations: [
    AppComponent,
    ModelerComponent,
    ViewerComponent,
    WorkspaceComponent,
    FilesComponent,
    FileListItemComponent,
    OwnFilesComponent,
    SharedFilesComponent,
    MovePobjectsComponent,
    PublishFolderFormComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpModule,
    HttpClientModule,
    RouterModule.forRoot(appRoutes)
    ],
  providers: [AuthService, UserService, RouteService, ApiService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
