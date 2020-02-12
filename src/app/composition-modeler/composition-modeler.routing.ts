import {RouterModule, Routes} from '@angular/router';
import {ModuleWithProviders} from '@angular/core';
import {CompositionModelerComponent} from './composition-modeler.component';

const routes: Routes = [
  {
    path: 'composition-modeler/:id',
    component: CompositionModelerComponent,
  }
];

export const CompositionModelerRouting: ModuleWithProviders = RouterModule.forChild(routes);