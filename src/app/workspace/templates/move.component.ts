import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'move-pobjects',
  templateUrl: './move.component.html'
})
export class MovePobjectsComponent implements OnInit {

  constructor() {}

  @Input() pobject;
  @Input() dest;
  @Input() parent;

  ngOnInit() {}

}