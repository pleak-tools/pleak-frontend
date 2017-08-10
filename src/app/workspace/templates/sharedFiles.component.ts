import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'shared-files',
  templateUrl: './sharedFiles.component.html'
})
export class SharedFilesComponent implements OnInit {

  constructor() {}

  @Input() pobject;
  @Input() parent;

  ngOnInit() {}

}