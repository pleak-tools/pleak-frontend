import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ApiService} from '../../api.service';

declare var $: any;

@Component({
  selector: 'link-model',
  templateUrl: './link-model.component.html',
})
export class LinkModelComponent {

  collapsed = false;
  Math: Math = Math;
  rootDir: any;
  @Input() linkedModel: any;
  @Input() selfId: number;
  selectedId: number;
  @Output() onLinked = new EventEmitter<any>();

  constructor(private apiService: ApiService) {
  }

  initModal() {

    this.apiService.getRootDirectory().subscribe((response) => {
      this.rootDir = response;
    });

    this.selectedId = this.linkedModel.id;

    let $selector = $('#linkModelForm');

    $selector.modal();

    let clearModal = () => {
      $selector.off('hidden.bs.modal', clearModal);
    };

    $selector.on('hidden.bs.modal', clearModal);
  }

  reloadModel() {
    this.onLinked.emit(this.linkedModel.id);
  }

  removeModel() {
  // to be implemented
  }

  linkModel() {
    this.onLinked.emit(this.selectedId);
    $('#linkModelForm').modal('hide');
  }

}
