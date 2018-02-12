import { Component, OnInit, Input } from '@angular/core';

declare var $: any;

@Component({
  selector: 'own-files',
  templateUrl: './ownFiles.component.html'
})
export class OwnFilesComponent implements OnInit {

  constructor() {}

  @Input() pobject;
  @Input() parent;

  ngOnInit() {
    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    })
  }

}