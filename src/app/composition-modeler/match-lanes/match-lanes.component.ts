import { Component, Input, OnChanges, SimpleChange, SimpleChanges } from '@angular/core';

@Component({
  selector: 'match-lanes',
  templateUrl: './match-lanes.component.html',
})
export class MatchLanesComponent implements OnChanges {

  Math: Math = Math;
  collapsed = false;
  @Input() linkedLanes;
  @Input() currentLanes;
  rootLanes = [];
  currentRootLanes = [];
  matchingLanes = [];
  linkedLanesMap = new Map<string, any>();
  currentLanesMap = new Map<string, any>();

  tracker(i, item) {
    return item.id;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.linkedLanes && changes.linkedLanes.currentValue) {
      this.rootLanes.length = 0;
      this.linkedLanesMap.clear();
      changes.linkedLanes.currentValue.map((item) => {
        const value = {lane: item, children: []};
        this.linkedLanesMap.set(item.id, value);
        if (item.type === 'bpmn:Participant') {
          this.rootLanes.push(value);
        }
      });

      this.linkedLanesMap.forEach((value, key, map) => {
        if (map.has(value.lane.parent)) {
          map.get(value.lane.parent).children.push(key);
        }
      });
    }

    if (changes.currentLanes && changes.currentLanes.currentValue && changes.currentLanes.currentValue !== changes.currentLanes.previousValue) {
      this.currentRootLanes.length = 0;
      this.currentLanesMap.clear();
      changes.currentLanes.currentValue.map((item) => {
        const value = {lane: item, children: []};
        this.currentLanesMap.set(item.id, value);
        if (item.type === 'bpmn:Participant') {
          this.currentRootLanes.push(value);
        }
      });

      this.currentLanesMap.forEach((value, key, map) => {
        if (map.has(value.lane.parent)) {
          map.get(value.lane.parent).children.push(key);
        }
      });

      this.matchingLanes = [];

      let recursion = (item, depth) => {
        this.matchingLanes.push({...item.lane, depth: depth});
        if (item.children.length) {
          item.children.forEach((child) => {
            recursion(this.currentLanesMap.get(child), depth + 1);
          });
        }
      };

      this.currentRootLanes.forEach((lane) => (recursion(lane, 0)));
    }
  }
}
