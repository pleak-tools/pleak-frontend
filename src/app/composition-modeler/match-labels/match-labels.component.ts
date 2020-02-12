import { Component, Input, NgZone } from '@angular/core';
import { CompositionModelerComponent } from '../composition-modeler.component';

declare var $: any;

@Component({
  selector: 'match-labels',
  templateUrl: 'match-labels.component.html',
  styleUrls: ['match-labels.component.scss']
})
export class MatchLabelsComponent {

  collapsed = false;
  @Input() selectedCompositionElement;
  @Input() elementRegistry;


  constructor(private zone: NgZone) {
  }

  initModal() {

    let $selector = $('#setLabelMatchModal');

    $selector.modal();

    let clearModal = () => {
      this.zone.run(() => {
        this.clearModal();
      });
      $selector.off('hidden.bs.modal', clearModal);
    };

    $selector.on('hidden.bs.modal', clearModal);
  }


  clearModal() {
  }

  //
  isLabelSetToBeIgnored(label: any): boolean {
    return label && label.action == "ignore";
  }

  //
  toggleLabelToBeIgnored(label: any): void {
    if (label) {
      label.action == "ignore" ? label.action = "" : label.action = "ignore";
    }
  }

  //
  labelHasAlternativeMatches(elementId: string, label: any): boolean {
    if (elementId && label) {
      let componentsLabels = this.getComponentModelsConnectableElements(elementId, label.direction)
      let possibleConnections = this.getCurrentModelConnectableElements(elementId, label.direction).concat(componentsLabels); // TODO replace with all possible matches
      possibleConnections = possibleConnections.filter(function (obj) {
        let labels = obj.labels.filter(function (olabel) {
          return olabel.label != label.label;
        });
        return labels.length > 0;
      });
      if (possibleConnections.length > 0) {
        return true;
      }
    }
    return false;
  }

  loadConnectionLabelsData(modelId: string, elementId: string, notConnectionElements: any[], registry: any): void {
    let componentModelCompositionLinkElements = notConnectionElements.filter((obj) => {
      return CompositionModelerComponent.isCompositionLinkElement(obj) && obj.businessObject && obj.businessObject.compositionLinkInfo && JSON.parse(obj.businessObject.compositionLinkInfo).labels.length > 0;
    });

    let filteredComponentModelCompositionLinkElements = componentModelCompositionLinkElements.map(a => {
      let id = a.businessObject.id;
      let name = a.businessObject.name ? a.businessObject.name : modelId + "_undefined";
      let type = a.businessObject.$type;
      let action = "";

      let linkLabels = JSON.parse(a.businessObject.compositionLinkInfo).labels.map(label => {
        let direction = label.linkTo ? label.linkFrom ? 'both' : 'to' : 'from';
        let labelObj = { id: label.id, lastModified: label.lastModified, label: label.label, direction: direction, possibleMatch: { label: "", direction: "", name: "", source: "" }, action: "" };
        let possibleMatch = this.getPossibleMatchForLabel(elementId, labelObj);
        if (possibleMatch) {
          labelObj.possibleMatch = possibleMatch;
        }
        return labelObj;
      });

      let linkTo = [];
      let linkFrom = [];

      let inputObjects = [];
      let outputObjects = [];

      if (type === "bpmn:Task") {
        inputObjects = this.getTaskInputObjects(a, registry[elementId]).map(obj => {
          let objLabels = undefined;
          if (obj.businessObject.compositionLinkInfo) {
            objLabels = obj.businessObject.compositionLinkInfo;
          }
          return { id: obj.businessObject.id, type: obj.businessObject.$type, name: obj.businessObject.name, labels: objLabels };
        });
        outputObjects = this.getTaskOutputObjects(a, registry[elementId]).map(obj => {
          let objLabels = undefined;
          if (obj.businessObject.compositionLinkInfo) {
            objLabels = obj.businessObject.compositionLinkInfo;
          }
          return { id: obj.businessObject.id, type: obj.businessObject.$type, name: obj.businessObject.name, labels: objLabels };
        });
      }

      return { id: id, name: name, type: type, action: action, linkLabels: linkLabels, linkTo: linkTo, linkFrom: linkFrom, inputs: inputObjects, outputs: outputObjects };
    });
    this.selectedCompositionElement.selectedModelConnectionsInfo = filteredComponentModelCompositionLinkElements;
  }

  // Return all input elements of the task
  getTaskInputObjects(taskElement: any, registry: any): any[] {
    let objects = [];
    if (taskElement != null && taskElement.businessObject) {
      let task = taskElement.businessObject;
      if (task.dataInputAssociations) {
        for (let i = 0; i < task.dataInputAssociations.length; i++) {
          if (task.dataInputAssociations[i].sourceRef) {
            objects.push(registry.get(task.dataInputAssociations[i].sourceRef[0].id));
          }
        }
      }
    }
    return objects;
  }

  // Return all output elements of the task
  getTaskOutputObjects(taskElement: any, registry: any): any[] {
    let objects = [];
    if (taskElement != null && taskElement.businessObject) {
      let task = taskElement.businessObject;
      if (task.dataOutputAssociations) {
        for (let i = 0; i < task.dataOutputAssociations.length; i++) {
          if (task.dataOutputAssociations[i].targetRef) {
            objects.push(registry.get(task.dataOutputAssociations[i].targetRef.id));
          }
        }
      }
    }
    return objects;
  }

  getPossibleMatchForLabel(elementId: string, label: any): any {
    let componentsLabels = this.getComponentModelsConnectableElements(elementId, label.direction)
    let possibleConnections = this.getCurrentModelConnectableElements(elementId, label.direction).concat(componentsLabels);
    if (possibleConnections.length > 0) {
      for (let possibleConnection of possibleConnections) {
        if (possibleConnection.labels.length > 0) {
          for (let possibleLabel of possibleConnection.labels) {
            if (possibleLabel.label == label.label) {
              return possibleLabel;
            }
          }
        }
      }
    }
    return null;
  }

  getCurrentModelConnectableElements(elementId: string, direction: string): any[] {
    let accept = "";
    if (direction == "to") {
      accept = "from";
    } else if (direction == "from") {
      accept = "to";
    } else if (direction == "both") {
      accept = "both";
    }
    return this.elementRegistry.filter((obj) => {
      return CompositionModelerComponent.isCompositionLinkElement(obj) && obj.businessObject && obj.businessObject.id != elementId && obj.businessObject.compositionLinkInfo && JSON.parse(obj.businessObject.compositionLinkInfo).labels.length > 0;
    }).map(element => {
      let labels = JSON.parse(element.businessObject.compositionLinkInfo).labels.map(label => {
        let linkDirection = label.linkTo ? label.linkFrom ? 'both' : 'to' : 'from';
        return { id: label.id, lastModified: label.lastModified, label: label.label, direction: linkDirection, name: label.name, source: "frame" };
      }).filter(label => {
        return label && label.direction == accept;
      });
      return { id: element.businessObject.id, name: element.businessObject.name, type: element.businessObject.$type, labels: labels, component: "frame" };
    }).filter(elem => {
      return elem && elem.labels.length > 0;
    });
  }

  getComponentModelsConnectableElements(elementId: string, direction: string): any[] {
    let accept = "";
    if (direction == "to") {
      accept = "from";
    } else if (direction == "from") {
      accept = "to";
    } else if (direction == "both") {
      accept = "both";
    }

    let componentModelTasks = this.elementRegistry.filter((obj) => {
      return obj.type === 'bpmn:Task' && obj.businessObject && obj.businessObject.compositionTaskDetails && obj.id != elementId;
    });

    let elements = [];
    for (let componentTask of componentModelTasks) {
      for (let element of JSON.parse(componentTask.businessObject.compositionTaskDetails).selectedModelElements) {
        if (element.labels && element.labels.length > 0) {
          let labels = [];
          for (let label of element.labels) {
            let linkDirection = label.linkTo ? label.linkFrom ? 'both' : 'to' : 'from';
            if (linkDirection == accept) {
              labels.push({ id: label.id, lastModified: label.lastModified, label: label.label, direction: linkDirection, name: label.name, source: componentTask.id });
            }
          }
          if (labels.length > 0) {
            elements.push({ id: element.id, name: element.name, type: element.type, labels: labels, component: this.getElementNameById(componentTask.id) });
          }
        }
      }

    }
    return elements;
  }

  initConnectionPanel(elementId: string, parentElementId: string, labelBeingLinked: any): void {

    this.initModal();

    let direction = labelBeingLinked.direction;

    let accept = "";
    if (direction == "to") {
      accept = "from";
    } else if (direction == "from") {
      accept = "to";
    } else if (direction == "both") {
      accept = "both";
    }

    let currentModelCompositionLinkElements = this.elementRegistry.filter((obj) => {
      return CompositionModelerComponent.isCompositionLinkElement(obj) && obj.businessObject && obj.businessObject.id != elementId && obj.businessObject.compositionLinkInfo && JSON.parse(obj.businessObject.compositionLinkInfo).labels.length > 0;
    }).map(element => {
      let labels = JSON.parse(element.businessObject.compositionLinkInfo).labels.map(label => {
        let linkDirection = label.linkTo ? label.linkFrom ? 'both' : 'to' : 'from';
        return { id: label.id, lastModified: label.lastModified, label: label.label, direction: linkDirection, name: label.name, source: "frame" };
      }).filter(label => {
        return label && label.direction == accept;
      });
      return { id: element.businessObject.id, name: element.businessObject.name, type: element.businessObject.$type, labels: labels };
    }).filter(elem => {
      return elem && elem.labels.length > 0;
    });

    let componentModelTasks = this.elementRegistry.filter((obj) => {
      return obj.type === 'bpmn:Task' && obj.businessObject && obj.businessObject.id && obj.businessObject.compositionTaskDetails && obj.businessObject.id != parentElementId;
    });
    let componentModelsCompositionLinkElements = [];
    for (let componentTask of componentModelTasks) {
      for (let element of JSON.parse(componentTask.businessObject.compositionTaskDetails).selectedModelElements) {
        if (element.labels.length > 0) {
          let labels = [];
          for (let label of element.labels) {
            let linkDirection = label.linkTo ? label.linkFrom ? 'both' : 'to' : 'from';
            if (linkDirection == accept) {
              labels.push({ id: label.id, lastModified: label.lastModified, label: label.label, direction: linkDirection, name: label.name, source: componentTask.id });
            }
          }
          if (labels.length > 0) {
            componentModelsCompositionLinkElements.push({ id: element.id, name: element.name, type: element.type, labels: labels, component: this.getElementNameById(componentTask.id) });
          }
        }
      }

    }

    this.selectedCompositionElement.elementBeingLinked = elementId;
    this.selectedCompositionElement.labelBeingLinked = labelBeingLinked;
    this.selectedCompositionElement.linkingDirection = accept;
    this.selectedCompositionElement.currentModelConnectableElements = currentModelCompositionLinkElements;
    this.selectedCompositionElement.componentModelsConnectableElements = componentModelsCompositionLinkElements;
  }

  isLabelMatchedToAnotherLabel(beingLinkedLabel: any, linkableLabel: any): boolean {
    return beingLinkedLabel.possibleMatch.id === linkableLabel.id && beingLinkedLabel.possibleMatch.label === linkableLabel.label ? true : false;
  }

  matchLabelOnElementToLabelOnAnotherElement(componentTaskElementId: string, elementId1: string, label1: any, elementId2: string, label2: any): void {
    if (componentTaskElementId && elementId1 && label1 && elementId2 && label2) {
      if (this.selectedCompositionElement.selectedModelConnectionsInfo.length > 0) {
        for (let element of this.selectedCompositionElement.selectedModelConnectionsInfo) {
          if (element.id == elementId1) {
            for (let label of element.linkLabels) {
              if (label.id == label1.id && label.label == label1.label) {
                label.possibleMatch = label2;
                break;
              }
            }
            break;
          }
        }
      }
      $('#setLabelMatchModal').modal('hide');
    }
  }

  getElementNameById(elementId: string): any {
    if (elementId) {
      if (this.elementRegistry.get(elementId) && this.elementRegistry.get(elementId).businessObject && this.elementRegistry.get(elementId).businessObject.name) {
        return this.elementRegistry.get(elementId).businessObject.name;
      }
    }
  }

}
