import { Component, Input } from '@angular/core';

@Component({
  selector: 'match-objects',
  templateUrl: 'match-objects.component.html',
})
export class MatchObjectsComponent {

  collapsed = false;
  @Input() selectedCompositionElement;

  modelChanged(value, data): void {
    data.match = data.allMatches.find(item => item.id === value);
  }
}
