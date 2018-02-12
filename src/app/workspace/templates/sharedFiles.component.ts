import { Component, OnInit, Input } from '@angular/core';

declare var $: any;

@Component({
  selector: 'shared-files',
  templateUrl: './sharedFiles.component.html'
})
export class SharedFilesComponent implements OnInit {

  constructor() {}

  @Input() pobject;
  @Input() parent;

  ngOnInit() {
    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    })
  }
}
