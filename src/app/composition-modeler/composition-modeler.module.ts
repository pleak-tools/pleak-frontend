import {NgModule} from '@angular/core';
import {CompositionModelerComponent} from './composition-modeler.component';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {CompositionModelerRouting} from './composition-modeler.routing';
import {LinkModelComponent} from './link-model/link-model.component';
import {MatchLanesComponent} from './match-lanes/match-lanes.component';
import {ManageLabelsComponent} from './manage-labels/manage-labels.component';
import {MatchLabelsComponent} from './match-labels/match-labels.component';
import {MatchObjectsComponent} from './match-objects/match-objects.component';


@NgModule({
  declarations: [
    CompositionModelerComponent,
    LinkModelComponent,
    MatchLanesComponent,
    ManageLabelsComponent,
    MatchLabelsComponent,
    MatchObjectsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CompositionModelerRouting
  ],
  providers: [],
  bootstrap: []
})
export class CompositionModelerModule {
}
