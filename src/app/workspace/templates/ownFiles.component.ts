import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'own-files',
  templateUrl: './ownFiles.component.html'
})
export class OwnFilesComponent implements OnInit {

  constructor() {}

  @Input() pobject;
  @Input() parent;

  ngOnInit() {}

}