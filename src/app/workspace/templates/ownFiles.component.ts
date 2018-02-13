import {Component, Input, AfterViewInit, ElementRef} from '@angular/core';

declare var $: any;

@Component({
  selector: 'own-files',
  templateUrl: './ownFiles.component.html'
})
export class OwnFilesComponent implements AfterViewInit {

  constructor(private elementRef: ElementRef) { }

  @Input() pobject;
  @Input() parent;

  ngAfterViewInit() {
    $('[data-toggle="tooltip"]', this.elementRef.nativeElement).tooltip();
  }

}