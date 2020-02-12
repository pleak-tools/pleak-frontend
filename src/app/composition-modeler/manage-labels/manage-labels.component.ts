import {Component, Input} from '@angular/core';

@Component({
  selector: 'manage-labels',
  templateUrl: './manage-labels.component.html',
})
export class ManageLabelsComponent {

  collapsed = false;
  @Input() element;

  addLabel() {
    this.element.labels.push({id: this.element.id, name: this.element.title, lastModified: new Date().getTime(), label: "", linkTo: false, linkFrom: false });
  };

  removeLabel(label) {
    this.element.labels = this.element.labels.filter((obj) => {
      return obj !== label;
    });
  }
}