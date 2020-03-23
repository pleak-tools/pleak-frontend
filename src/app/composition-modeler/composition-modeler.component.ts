import { Component, OnInit, ViewChild } from '@angular/core';
import { AuthService } from '../auth/auth.service';

import Modeler from 'bpmn-js/lib/Modeler';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import { SqlBPMNModdle } from '../../assets/bpmn-labels-extension';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { MatchLabelsComponent } from './match-labels/match-labels.component';

declare function require(name: string);
declare let $: any;

let jwt_decode = require('jwt-decode');
let config = require('./../../config.json');

@Component({
  selector: 'app-composition-modeler',
  templateUrl: './composition-modeler.component.html',
  styleUrls: ['./composition-modeler.component.less']
})
export class CompositionModelerComponent implements OnInit {

  constructor(public http: HttpClient, public authService: AuthService, private route: ActivatedRoute, private router: Router, private toastr: ToastrService) { }

  @ViewChild(MatchLabelsComponent, { static: false }) matchLabelsComp: MatchLabelsComponent;

  private viewer: NavigatedViewer;
  private eventBus: any;
  private elementRegistry: any;
  private overlays: any;
  private canvas: any;

  private modelId: string;
  public fileId: number = null;
  private file: any = null;

  private lastContent: string = '';
  private lastModified: number = null;

  fileLoaded = false;

  private tempModeler: any;
  private tempModeling: any;
  private tempElementRegistry: any = {};
  private tempFile: any = {};

  private resultModeler: any;
  private resultModeling: any;
  private resultClipboard: any;
  private resultCopyPaste: any;
  private resultModdle: any;
  private resultFile: any;
  private resultElementRegistry: any;

  private resultViewer: NavigatedViewer;

  showMergeResults: boolean = false;
  mergeInProgress: boolean = false;
  mergeDone: boolean = false;

  // Sidebar contents
  selectedCompositionElement: any = {};
  selectedCompositionLinkElement: any = {};

  private newConnections: any = {};
  private lastMergedElementsForElement: any = {};

  private compositionElementMarkers: any = {};

  public consoleLog: any[] = [];
  public showConsoleLog: boolean = true;

  getMatchesForInputOfElement(input: any, element: any): any {
    let matchElement = "";
    let match = undefined;
    let matches = [];
    for (let cElement of this.selectedCompositionElement.selectedModelConnectionsInfo) {
      if (cElement.linkLabels.length > 0) {
        for (let label of cElement.linkLabels) {
          if (label.possibleMatch) {
            if (input.businessObject.compositionLinkInfo) {
              let labelsInfo = JSON.parse(input.businessObject.compositionLinkInfo);
              if (labelsInfo.labels.length > 0) {
                for (let lLabel of labelsInfo.labels) {
                  if (label.possibleMatch.id == lLabel.id) {
                    if (cElement.inputs && cElement.inputs.length > 0) {
                      matchElement = cElement;
                      for (let inp of cElement.inputs) {
                        if (inp.name == input.businessObject.name) {
                          match = inp;
                        }
                        let tmp = matches.filter((obj) => {
                          return obj.id === inp.id;
                        });
                        if (tmp.length === 0) {
                          matches.push(inp);
                        }
                      }
                      if (!match) {
                        match = cElement.inputs[0];
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return { elementId: element.businessObject.id, input: { id: input.businessObject.id, name: input.businessObject.name, type: input.businessObject.$type }, matchElement: matchElement, match: match, allMatches: matches };
  }

  getMatchesForOutputOfElement(output: any, element: any): any {
    let matchElement = "";
    let match = undefined;
    let matches = [];
    for (let cElement of this.selectedCompositionElement.selectedModelConnectionsInfo) {
      if (cElement.linkLabels.length > 0) {
        for (let label of cElement.linkLabels) {
          if (label.possibleMatch) {
            if (output.businessObject.compositionLinkInfo) {
              let labelsInfo = JSON.parse(output.businessObject.compositionLinkInfo);
              if (labelsInfo.labels.length > 0) {
                for (let lLabel of labelsInfo.labels) {
                  if (label.possibleMatch.id == lLabel.id) {
                    if (cElement.outputs && cElement.outputs.length > 0) {
                      matchElement = cElement;
                      for (let out of cElement.outputs) {
                        if (out.name == output.businessObject.name) {
                          match = out;
                        }
                        let tmp = matches.filter((obj) => {
                          return obj.id === out.id;
                        });
                        if (tmp.length === 0) {
                          matches.push(out);
                        }
                      }
                      if (!match) {
                        match = cElement.outputs[0];
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return { elementId: element.businessObject.id, input: { id: output.businessObject.id, name: output.businessObject.name, type: output.businessObject.$type }, matchElement: matchElement, match: match, allMatches: matches };
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

  //////////////////////

  toggleMergeResults(): void {
    this.showMergeResults = !this.showMergeResults;
  }

  toggleElementToBeRemoved(elementId: string): void {
    let elementInfo = this.selectedCompositionElement.selectedModelElements.filter(function (obj) { return obj.id == elementId });
    if (elementInfo.length > 0) {
      if (elementInfo[0].action == "delete") {
        elementInfo[0].action = "";
      } else {
        elementInfo[0].action = "delete"
      }
    }
  }

  isElementSetToBeRemoved(elementId: string): boolean {
    let elementInfo = this.selectedCompositionElement.selectedModelElements.filter(function (obj) { return obj.id == elementId });
    if (elementInfo.length > 0) {
      if (elementInfo[0].action == "delete") {
        return true;
      }
    }
    return false;
  }

  linkElementToElement(element1Id: string, element2Id: string, element2Name: string, direction: string, source: string): void {
    if (element1Id && element2Id && element2Name && direction) {
      let elementInfo = this.selectedCompositionElement.selectedModelElements.filter(function (obj) { return obj.id == element1Id });
      if (elementInfo.length > 0) {
        if (direction == "to") {
          if (!elementInfo[0].linkTo) {
            elementInfo[0].linkTo = [{ id: element2Id, name: element2Name, source: source }];
          } else {
            elementInfo[0].linkTo.push({ id: element2Id, name: element2Name, source: source });
          }
        } else if (direction == "from") {
          if (!elementInfo[0].linkFrom) {
            elementInfo[0].linkFrom = [{ id: element2Id, name: element2Name, source: source }];
          } else {
            elementInfo[0].linkFrom.push({ id: element2Id, name: element2Name, source: source });
          }
        }
      }
    }
  }

  removeDirectedLinkBetweenElements(element1Id: string, element2Id: string, element2Name: string, direction: string, source: string): void {
    if (element1Id && element2Id && element2Name && direction) {
      let elementInfo = this.selectedCompositionElement.selectedModelElements.filter(function (obj) { return obj.id == element1Id });
      if (elementInfo.length > 0) {
        if (direction == "to") {
          if (elementInfo[0].linkTo && elementInfo[0].linkTo.length > 0) {
            let isLinkedTo = elementInfo[0].linkTo.filter(function (obj) { return obj.id == element2Id && obj.name == element2Name && obj.source == source });
            if (isLinkedTo.length > 0) {
              elementInfo[0].linkTo = elementInfo[0].linkTo.filter(function (obj) { return obj.id !== element2Id && obj.name !== element2Name && obj.source !== source });
            }
          }
        } else if (direction == "from") {
          if (elementInfo[0].linkFrom && elementInfo[0].linkFrom.length > 0) {
            let isLinkedFrom = elementInfo[0].linkFrom.filter(function (obj) { return obj.id == element2Id && obj.name == element2Name && obj.source == source });
            if (isLinkedFrom.length > 0) {
              elementInfo[0].linkFrom = elementInfo[0].linkFrom.filter(function (obj) { return obj.id !== element2Id && obj.name !== element2Name && obj.source !== source });
            }
          }
        }
      }
    }
  }

  getElementIdOnCurrentModel(elementId: string, elementName: string, source: string): string {
    if (elementName && elementName.includes("undefined")) {
      elementName = undefined;
    }
    if (source == "frame") {
      // Element is from the current (frame) model
      let element = this.resultElementRegistry.get(elementId);
      if (element && element.businessObject.id && element.businessObject.name == elementName) {
        return elementId;
      } else if (element && element.businessObject.id && !elementName) {
        return elementId;
      }
    } else {
      // Element is from a component model (already pasted)
      if (this.newConnections[source]) {
        let connection = this.newConnections[source].filter(function (obj) {
          return obj.from === elementId;
        });
        if (connection.length > 0) {
          return this.resultElementRegistry.get(connection[0].to).businessObject.id;
        }
      }
    }
  }

  getListOfAllFrameModelLabels(): any[] {
    let labels = [];
    let elementsWithLabels = this.elementRegistry.filter((element) => {
      return element.businessObject && element.businessObject.compositionLinkInfo && CompositionModelerComponent.isCompositionLinkElement(element);
    });
    if (elementsWithLabels.length > 0) {
      for (let labelElement of elementsWithLabels) {
        for (let label of JSON.parse(labelElement.businessObject.compositionLinkInfo).labels) {
          labels.push({ id: label.id, name: label.label, elementName: labelElement.businessObject.name, used: false });
        }
      }
    }
    return labels;
  }

  markUsedFrameModelLabelsUsed(connectionsInfo, labels) {
    for (let element of connectionsInfo) {
      for (let label of element.linkLabels) {
        if (label.possibleMatch && label.possibleMatch.id && label.possibleMatch.label && label.action != "ignore") {
          let tt = labels.filter((lbl) => {
            return lbl.id == label.possibleMatch.id && lbl.name == label.possibleMatch.label;
          });
          for (let labl of tt) {
            labl.used = true;
          }
        }
      }
    }
  }


  createConnectionsBasedOnSetLinks(): Promise<void> {
    return new Promise((connectionsCreated, connectionsNotCreated) => {
      let frameModelLabels = this.getListOfAllFrameModelLabels();
      let allComponentModelTasks = this.getAllTasksOfComponentModels();
      let flag = false;
      let errors = [];
      for (let task of allComponentModelTasks) {
        let elementId = task.businessObject.id;
        let elementName = task.businessObject.name ? task.businessObject.name : "Unnamed task";
        let savedData = (<any>this.getAlreadySavedCompositionDataForElementFromRegistry(elementId, this.resultElementRegistry));
        if (savedData) {
          this.markUsedFrameModelLabelsUsed(savedData.selectedModelConnectionsInfo, frameModelLabels);
          let selectedModelElements = savedData.selectedModelElements;
          let elementsToBeLinked = selectedModelElements.filter(function (obj) {
            return obj.labels.length > 0 || obj.linkTo && obj.linkTo.length > 0 || obj.linkFrom && obj.linkFrom.length > 0;
          });
          for (let element of elementsToBeLinked) {
            if (element.labels.length > 0) {
              for (let label of element.labels) {
                let labelFlag = false;
                let matchingElement = savedData.selectedModelConnectionsInfo.filter((obj) => {
                  return obj.id == element.id;
                });
                if (matchingElement.length > 0) {
                  let matchingLabel = matchingElement[0].linkLabels.filter((obj) => {
                    return obj.id == label.id && obj.label == label.label;
                  });
                  if (matchingLabel.length > 0) {
                    if (matchingLabel[0].action == "ignore") {
                      labelFlag = true;
                    }
                  }
                }
                if (!labelFlag) {
                  if (label.linkTo && element.linkFrom.length === 0) {
                    flag = true;
                    errors.push('Component "' + elementName + '" has one or more unmatched incoming labels!');
                  }
                  if (label.linkFrom && element.linkTo.length === 0) {
                    flag = true;
                    errors.push('Component "' + elementName + '" has one or more unmatched outgoing labels!');
                  }
                  if (label.linkTo && label.linkFrom && (element.linkFrom.length === 0 || element.linkTo.length === 0)) {
                    flag = true;
                    errors.push('Component "' + elementName + '" has one or more unmatched incoming-outgoing labels!');
                  }
                }
              }
            }
            if (element.linkTo && element.linkTo.length > 0) {
              for (let linkToElement of element.linkTo) {
                let currentFromId = this.getElementIdOnCurrentModel(element.id, element.name, element.source);
                let currentToId = this.getElementIdOnCurrentModel(linkToElement.id, linkToElement.name, linkToElement.source);
                let newFromId = currentFromId;
                let newToId = currentToId;
                if (!newFromId || !newToId) {
                  let linkFromName = element.name ? element.name : "???";
                  let linkToName = linkToElement.name ? linkToElement.name : "???";
                  this.consoleLog.push({ type: "warning", msg: "cannot link " + linkFromName + " to element " + linkToName });
                }
                if (this.resultElementRegistry.get(currentToId) && (this.resultElementRegistry.get(currentToId).type === "bpmn:StartEvent" && !this.resultElementRegistry.get(currentToId).businessObject.eventDefinitions) || this.resultElementRegistry.get(currentFromId) && (this.resultElementRegistry.get(currentFromId).type === "bpmn:EndEvent" && !this.resultElementRegistry.get(currentFromId).businessObject.eventDefinitions)) {
                  newFromId = currentToId;
                  newToId = currentFromId;
                }
                if (!this.isThereConnectionBetweenTwoElementsByIds(newFromId, newToId)) {
                  this.connectTwoElementsByIds(newFromId, newToId);
                }
              }
            }
            if (element.linkFrom && element.linkFrom.length > 0) {
              for (let linkFromElement of element.linkFrom) {
                let currentFromId = this.getElementIdOnCurrentModel(linkFromElement.id, linkFromElement.name, linkFromElement.source);
                let currentToId = this.getElementIdOnCurrentModel(element.id, element.name, element.source);
                let newFromId = currentFromId;
                let newToId = currentToId;
                if (!newFromId || !newToId) {
                  let linkFromName = linkFromElement.name ? linkFromElement.name : "???";
                  let linkToName = element.name ? element.name : "???";
                  this.consoleLog.push({ type: "warning", msg: "cannot link " + linkFromName + " to element " + linkToName });
                }
                if (this.resultElementRegistry.get(currentToId) && (this.resultElementRegistry.get(currentToId).type === "bpmn:StartEvent" && !this.resultElementRegistry.get(currentToId).businessObject.eventDefinitions) || this.resultElementRegistry.get(currentFromId) && (this.resultElementRegistry.get(currentFromId).type === "bpmn:EndEvent" && !this.resultElementRegistry.get(currentFromId).businessObject.eventDefinitions)) {
                  newFromId = currentToId;
                  newToId = currentFromId;
                }
                if (!this.isThereConnectionBetweenTwoElementsByIds(newFromId, newToId)) {
                  this.connectTwoElementsByIds(newFromId, newToId);
                }
              }
            }
          }
        }
      }
      let unUsedLabels = frameModelLabels.filter((label) => {
        return label.used == false
      });
      if (unUsedLabels.length > 0) {
        flag = true;
        for (let unUsedLabel of unUsedLabels) {
          errors.push('Frame model element "' + unUsedLabel.elementName + '" has unused label "' + unUsedLabel.name + '"!');
        }
      }
      if (flag) {
        connectionsNotCreated(errors.filter((v, i, a) => a.indexOf(v) === i).reverse());
      }
      connectionsCreated();
    });
  }

  restoreComponentsGatewayDefaults(): void {
    let allComponentModelTasks = this.getAllTasksOfComponentModels();
    for (let task of allComponentModelTasks) {
      let gatewayConnections = this.newConnections[task.id].filter((element) => {
        return element.def && element.def.source && element.def.target;
      });
      for (let gatewayConnection of gatewayConnections) {
        let gatewayElement = this.resultElementRegistry.get(gatewayConnection.to);
        let targetElementConnections = this.newConnections[task.id].filter((element) => {
          return element.from == gatewayConnection.def.target;
        });
        for (let targetConnection of targetElementConnections) {
          let targetElement = this.resultElementRegistry.get(targetConnection.to);
          let matchingSequenceFlows = this.resultElementRegistry.filter((obj) => {
            return obj.type === 'bpmn:SequenceFlow' && obj.source && obj.target && obj.source.id && obj.target.id && obj.source.id == gatewayElement.businessObject.id && obj.target.id == targetElement.businessObject.id;
          });
          for (let sequenceFlow of matchingSequenceFlows) {
            gatewayElement.businessObject.default = sequenceFlow;
          }
        }
      }
    }
  }

  restoreGatewaysDefaultFlowsForComponentTask(task: any): void {
    for (let connection of this.newConnections[task.id]) {
      if (connection.def) {
        let filteredConnection = this.newConnections[task.id].filter((obj) => {
          return "from_" + connection.def.source + "_" + obj.from == connection.def.target;
        });
        if (filteredConnection.length > 0) {
          let gateway = this.resultElementRegistry.get(connection.to);
          let targetElement = this.resultElementRegistry.get(filteredConnection[0].to);
          let sequenceFlows = this.resultElementRegistry.filter((obj) => {
            return obj.type === 'bpmn:SequenceFlow';
          });
          let defaultSequenceFlow = sequenceFlows.filter((obj) => {
            return obj.source && obj.target && obj.source.id && obj.target.id && obj.source.id == gateway.businessObject.id && obj.target.id == targetElement.businessObject.id;
          });
          if (defaultSequenceFlow.length === 1) {
            gateway.businessObject.default = defaultSequenceFlow[0];
          }
        }
      }
    }
  }

  restoreGatewaysDefaultFlowsForFrameModel(task: any): void {
    let defaultGateways = [];
    let gateways = this.resultElementRegistry.filter((element) => {
      return element.type === 'bpmn:ExclusiveGateway';
    });
    for (let gateway of gateways) {
      if (gateway.businessObject && gateway.businessObject.default && gateway.businessObject.compositionLinkInfo) {
        defaultGateways.push(gateway.id);
      }
    }
    if (task.businessObject && task.businessObject.compositionTaskDetails) {
      let taskInfo = JSON.parse(task.businessObject.compositionTaskDetails);
      let componentElements = taskInfo.selectedModelElements;
      let tmp = componentElements.filter((element) => {
        return element.linkFrom.length > 0;
      });
      for (let elem of tmp) {
        for (let linkElem of elem.linkFrom) {
          for (let gateway of defaultGateways) {
            if (linkElem.id == gateway) {
              let filteredConnection = this.newConnections[task.id].filter((obj) => {
                return obj.from == elem.id;
              });
              if (filteredConnection.length > 0) {
                let gw = this.resultElementRegistry.get(gateway);
                let targetElement = this.resultElementRegistry.get(filteredConnection[0].to);
                let defaultSequenceFlow = this.resultElementRegistry.filter((obj) => {
                  return obj.type === 'bpmn:SequenceFlow' && obj.source && obj.target && obj.source.id && obj.target.id && obj.source.id == gw.businessObject.id && obj.target.id == targetElement.businessObject.id;
                });
                if (defaultSequenceFlow.length === 1) {
                  gw.businessObject.default = defaultSequenceFlow[0];
                }
              }
            }
          }
        }
      }
    }
  }

  getUniqueObjectsByIdFromArray(array: any[]) {
    let uniqueObjects = [];
    for (let object of array) {
      let objectAlreadyInArray = uniqueObjects.filter((obj) => {
        return obj.businessObject.id == object.businessObject.id;
      });
      if (objectAlreadyInArray.length === 0) {
        uniqueObjects.push(object);
      }
    }
    return uniqueObjects;
  }

  removeDuplicateAssociations(): Promise<void> {
    return new Promise((connectionsRemoved) => {
      let iUnique = [];
      let iDuplicates = [];

      let oUnique = [];
      let oDuplicates = [];

      let sqUnique = [];
      let sqDuplicates = [];

      let mfUnique = [];
      let mfDuplicates = [];

      let aUnique = [];
      let aDuplicates = [];

      // DataInputAssociations
      let inputAssociations = this.getUniqueObjectsByIdFromArray(this.resultElementRegistry.filter((element) => {
        return element.businessObject &&
          element.type === 'bpmn:DataInputAssociation' &&
          element.source &&
          element.target &&
          element.source.businessObject &&
          element.target.businessObject &&
          element.source.businessObject.id &&
          element.target.businessObject.id
      }));
      for (let association of inputAssociations) {
        let temp = iUnique.filter((element) => {
          return element.source &&
            element.target &&
            element.source.businessObject &&
            element.target.businessObject &&
            element.source.businessObject.id &&
            element.target.businessObject.id &&
            element.source.businessObject.id == association.source.businessObject.id &&
            element.target.businessObject.id == association.target.businessObject.id &&
            element.type == association.type &&
            element.type === 'bpmn:DataInputAssociation' &&
            element.businessObject.id != association.businessObject.id;
        });
        if (temp.length === 0) {
          iUnique.push(association);
        } else if (temp.length === 1) {
          iDuplicates.push(association);
        }
      }

      // DataOutputAssociations
      let outputAssociations = this.getUniqueObjectsByIdFromArray(this.resultElementRegistry.filter((element) => {
        return element.businessObject &&
          element.type === 'bpmn:DataOutputAssociation' &&
          element.source &&
          element.target &&
          element.source.businessObject &&
          element.target.businessObject &&
          element.source.businessObject.id &&
          element.target.businessObject.id
      }));
      for (let association of outputAssociations) {
        let temp = oUnique.filter((element) => {
          return element.source &&
            element.target &&
            element.source.businessObject &&
            element.target.businessObject &&
            element.source.businessObject.id &&
            element.target.businessObject.id &&
            element.source.businessObject.id == association.source.businessObject.id &&
            element.target.businessObject.id == association.target.businessObject.id &&
            element.type == association.type &&
            element.type === 'bpmn:DataOutputAssociation' &&
            element.businessObject.id != association.businessObject.id;
        });
        if (temp.length === 0) {
          oUnique.push(association);
        } else if (temp.length === 1) {
          oDuplicates.push(association);
        }
      }

      // MessageFlows
      let messageFlows = this.getUniqueObjectsByIdFromArray(this.resultElementRegistry.filter((element) => {
        return element.businessObject &&
          element.type === 'bpmn:MessageFlow' &&
          element.source &&
          element.target &&
          element.source.businessObject &&
          element.target.businessObject &&
          element.source.businessObject.id &&
          element.target.businessObject.id
      }));
      for (let association of messageFlows) {
        let temp = mfUnique.filter((element) => {
          return element.source &&
            element.target &&
            element.source.businessObject &&
            element.target.businessObject &&
            element.source.businessObject.id &&
            element.target.businessObject.id &&
            element.source.businessObject.id == association.source.businessObject.id &&
            element.target.businessObject.id == association.target.businessObject.id &&
            element.type == association.type &&
            element.type === 'bpmn:MessageFlow' &&
            element.businessObject.id != association.businessObject.id;
        });
        if (temp.length === 0) {
          mfUnique.push(association);
        } else if (temp.length === 1) {
          mfDuplicates.push(association);
        }
      }

      // Associations
      let associations = this.getUniqueObjectsByIdFromArray(this.resultElementRegistry.filter((element) => {
        return element.businessObject &&
          element.type === 'bpmn:Association' &&
          element.source &&
          element.target &&
          element.source.businessObject &&
          element.target.businessObject &&
          element.source.businessObject.id &&
          element.target.businessObject.id
      }));
      for (let association of associations) {
        let temp = aUnique.filter((element) => {
          return element.source &&
            element.target &&
            element.source.businessObject &&
            element.target.businessObject &&
            element.source.businessObject.id &&
            element.target.businessObject.id &&
            element.source.businessObject.id == association.source.businessObject.id &&
            element.target.businessObject.id == association.target.businessObject.id &&
            element.type == association.type &&
            element.type === 'bpmn:Association' &&
            element.businessObject.id != association.businessObject.id;
        });
        if (temp.length === 0) {
          aUnique.push(association);
        } else if (temp.length === 1) {
          aDuplicates.push(association);
        }
      }

      // SequenceFlows
      let sequenceFlows = this.getUniqueObjectsByIdFromArray(this.resultElementRegistry.filter((element) => {
        return element.businessObject &&
          element.type === 'bpmn:SequenceFlow' &&
          element.source &&
          element.target &&
          element.source.businessObject &&
          element.target.businessObject &&
          element.source.businessObject.id &&
          element.target.businessObject.id;
      }));
      for (let association of sequenceFlows) {
        let temp = sqUnique.filter((element) => {
          return element.source &&
            element.target &&
            element.source.businessObject &&
            element.target.businessObject &&
            element.source.businessObject.id &&
            element.target.businessObject.id &&
            element.source.businessObject.id == association.source.businessObject.id &&
            element.target.businessObject.id == association.target.businessObject.id &&
            element.type == association.type &&
            element.type === 'bpmn:SequenceFlow' &&
            element.businessObject.id != association.businessObject.id;
        });
        if (temp.length === 0) {
          sqUnique.push(association);
        } else if (temp.length === 1) {
          sqDuplicates.push(association);
        }
      }

      console.log("DataInputAssociations: " + inputAssociations.length);
      console.log("Unique DataInputAssociations: " + iUnique.length);
      console.log("DataInputAssociation duplicates " + iDuplicates.length);
      for (let connection of iDuplicates) {
        if (connection && connection.businessObject) {
          this.removeConnection(connection);
        }
      }
      if (iDuplicates.length > 0) {
        this.consoleLog.push({ type: "normal", msg: iDuplicates.length + " DataInputAssociation duplicates removed" });
      }

      console.log("DataOutputAssociations: " + outputAssociations.length);
      console.log("Unique DataOutputAssociations: " + oUnique.length);
      console.log("DataOutputAssociation duplicates " + oDuplicates.length);
      for (let connection of oDuplicates) {
        if (connection && connection.businessObject) {
          this.removeConnection(connection);
        }
      }
      if (oDuplicates.length > 0) {
        this.consoleLog.push({ type: "normal", msg: oDuplicates.length + " DataOutputAssociation duplicates removed" });
      }

      console.log("MessageFlows: " + messageFlows.length);
      console.log("Unique MessageFlows: " + mfUnique.length);
      console.log("MessageFlow duplicates " + mfDuplicates.length);
      for (let connection of mfDuplicates) {
        if (connection && connection.businessObject) {
          this.removeConnection(connection);
        }
      }
      if (mfDuplicates.length > 0) {
        this.consoleLog.push({ type: "normal", msg: mfDuplicates.length + " MessageFlow duplicates removed" });
      }

      console.log("Associations: " + associations.length);
      console.log("Unique Associations: " + aUnique.length);
      console.log("Association duplicates " + aDuplicates.length);
      for (let connection of aDuplicates) {
        if (connection && connection.businessObject) {
          this.removeConnection(connection);
        }
      }
      if (aDuplicates.length > 0) {
        this.consoleLog.push({ type: "normal", msg: aDuplicates.length + " Association duplicates removed" });
      }

      console.log("SequenceFlows: " + sequenceFlows.length);
      console.log("Unique SequenceFlows: " + sqUnique.length);
      console.log("SequenceFlow duplicates " + sqDuplicates.length);
      for (let connection of sqDuplicates) {
        if (connection && connection.businessObject) {
          this.removeConnection(connection);
        }
      }
      if (sqDuplicates.length > 0) {
        this.consoleLog.push({ type: "normal", msg: sqDuplicates.length + " SequenceFlow duplicates removed" });
      }
      connectionsRemoved();
    });
  }

  debugFn1(): void {
    let tasks = this.resultElementRegistry.filter((element) => { return element.businessObject && element.businessObject.$type === 'bpmn:Task' && element.businessObject.incoming && element.businessObject.incoming.length > 1 });
    for (let task of tasks) {
      let taskName = task.businessObject.name ? task.businessObject.name : "undefined";
      this.consoleLog.push({ type: "warning", msg: "task " + taskName + " has " + task.businessObject.incoming.length + " incoming connections" });
      for (let incoming of task.businessObject.incoming) {
        let sourceName = incoming.sourceRef.name ? incoming.sourceRef.name : "undefined";
        this.consoleLog.push({ type: "warning", msg: "task " + taskName + " has incoming connection from " + sourceName });
      }
    }

    let msgCatchEvents = this.resultElementRegistry.filter((element) => { return element.businessObject && element.businessObject.$type === 'bpmn:IntermediateCatchEvent' && element.businessObject.incoming && element.businessObject.incoming.length > 1 });
    for (let msgCatchEvent of msgCatchEvents) {
      let msgEventName = msgCatchEvent.businessObject.name ? msgCatchEvent.businessObject.name : "undefined";
      this.consoleLog.push({ type: "warning", msg: "intermediate (message) catch event " + msgEventName + " has " + msgCatchEvent.businessObject.incoming.length + " incoming connections" });
      for (let incoming of msgCatchEvent.businessObject.incoming) {
        let sourceName = incoming.sourceRef.name ? incoming.sourceRef.name : "undefined";
        this.consoleLog.push({ type: "warning", msg: "intermediate (message) catch event " + msgEventName + " has incoming connection from " + sourceName });
      }
    }
  }

  debugFn2(): void {
    let exclusiveGateways = this.resultElementRegistry.filter((element) => {
      return element.businessObject && element.type && element.type !== 'label' && element.businessObject.$type === 'bpmn:ExclusiveGateway' && !element.businessObject.default;
    });
    if (exclusiveGateways.length > 0) {
      this.consoleLog.push({ type: "warning", msg: exclusiveGateways.length + " exclusive gateways are missing default sequence flow" });
      for (let gateway of exclusiveGateways) {
        this.consoleLog.push({ type: "warning", msg: "gateway " + gateway.businessObject.name + " is missing default sequence flow" });
      }
    }
  }

  mergeComponentsAndShowResults(): void {
    this.selectedCompositionElement = {};
    this.selectedCompositionLinkElement = {};
    this.mergeInProgress = true;
    this.mergeDone = false;
    this.showConsoleLog = true;
    this.initResultModeler().then(() => {
      console.log("resultModeler init successful");
      this.consoleLog.push({ type: "success", msg: "resultModeler init successful" });
      let allComponentModelTasks = this.getAllTasksOfComponentModels();
      if (allComponentModelTasks.length === 0) {
        this.mergeInProgress = false;
        this.toastr.error('No component models added, nothing to merge!');
      } else {
        this.mergeAll().then(() => {
          this.createConnectionsBasedOnSetLinks().then(() => {
            this.removeDuplicateAssociations().then(() => {
              this.restoreComponentsGatewayDefaults();
              console.log("merge of all component models finished");
              this.consoleLog.push({ type: "success", msg: "merge of all component models finishedl" });
              console.log("all additional connections between elements created");
              this.consoleLog.push({ type: "success", msg: "all additional connections between elements created" });
              let allComponentModelTasks = this.getAllTasksOfComponentModels();
              for (let task of allComponentModelTasks) {
                this.restoreGatewaysDefaultFlowsForFrameModel(task);
                this.restoreGatewaysDefaultFlowsForComponentTask(task);
                if (task.incoming && task.incoming.length > 0) {
                  for (let incoming of task.incoming) {
                    this.removeConnection(incoming);
                  }
                }
                this.removeElementById(task.businessObject.id);
                if (task.outgoing && task.outgoing.length > 0) {
                  for (let outgoing of task.outgoing) {
                    this.removeConnection(outgoing);
                  }
                }
              }
              console.log("all component model tasks removed");
              this.consoleLog.push({ type: "success", msg: "all component model tasks removed" });
              this.debugFn1();
              this.debugFn2();
              this.initResultViewer().then(() => {
                this.loadMergedExportButton();
                this.mergeInProgress = false;
                this.mergeDone = true;
                this.showMergeResults = true;
                console.log("merge successful");
                this.consoleLog.push({ type: "success", msg: "merge successful" });
              }).catch(() => {
                this.toastr.error('File is empty or invalid!');
                this.revertAll();
              });
            });
          }).catch((errors) => {
            this.mergeInProgress = false;
            for (let error of errors) {
              this.toastr.warning(error.toString(), '', { disableTimeOut: true });
            }
            this.revertAll();
            console.log("merge of all component models failed");
            this.consoleLog.push({ type: "error", msg: "merge of all component models failed" });
          });
        }).catch(() => {
          this.mergeInProgress = false;
          this.toastr.error('This version of composition cannot be merged, please reload component models.');
          this.revertAll();
          console.log("merge of all component models failed");
          this.consoleLog.push({ type: "error", msg: "merge of all component models failed" });
        });
      }
    }).catch(() => {
      this.mergeInProgress = false;
      this.toastr.error('Nothing to merge, file is empty!');
    });

  }

  revertAll(): void {
    this.tempModeler = null;
    this.tempModeling = null;
    this.tempElementRegistry = {};
    this.tempFile = {};

    this.resultModeler = null;
    this.resultModeling = null;
    this.resultClipboard = null;
    this.resultCopyPaste = null;
    this.resultModdle = null;
    this.resultFile = null;
    this.resultElementRegistry = null;

    this.newConnections = {};
    this.lastMergedElementsForElement = {};

    this.mergeInProgress = false;
    this.mergeDone = false;
    this.showMergeResults = false;

    this.consoleLog = [];
    this.showConsoleLog = false;

    $('#resultCanvas').addClass('hidden');
    $('#tempResultCanvas, #resultCanvas').html('');
  }

  mergeAll(): Promise<void> {
    return new Promise((mergeSuccessful, mergeFailed) => {
      let allComponentModelTasks = this.getAllTasksOfComponentModels().reverse();
      console.log("merge of all " + allComponentModelTasks.length + " component models started");
      this.consoleLog.push({ type: "success", msg: "merge of all " + allComponentModelTasks.length + " component models started" });
      for (let i = 0, pr = Promise.resolve(); i < allComponentModelTasks.length; i++) {
        pr = pr.then(_ => new Promise<void>(resolve => {
          let task = allComponentModelTasks[i];
          let componentModelInfo = JSON.parse(task.businessObject.compositionTaskDetails);
          if (!componentModelInfo.version || componentModelInfo.version < 2) {
            mergeFailed();
          } else {
            console.log("START merge of component model " + (i + 1) + "/" + allComponentModelTasks.length);
            this.consoleLog.push({ type: "normal", msg: "START merge of component model " + (i + 1) + "/" + allComponentModelTasks.length });
            if (componentModelInfo) {
              let elementId = task.businessObject.id;
              let savedData = (<any>this.getAlreadySavedCompositionDataForElementFromRegistry(elementId, this.resultElementRegistry));
              if (savedData) {
                this.loadSavedComponentModelForElementInRegistry(elementId, this.resultElementRegistry).then(() => {
                  let selectedModelElements = savedData.selectedModelElements;
                  let modelId = savedData.modelId;
                  let parentElements = savedData.parentElements;
                  let knownConnections = [];
                  for (let conn of parentElements) {
                    knownConnections.push({ from: conn.id, to: conn.matches });
                  }
                  this.loadNewConnectionsAfterCopyPasteAndMergeOfComponentModel(knownConnections, elementId, selectedModelElements, modelId, savedData.joiningData);
                  let elementsToBeDeleted = selectedModelElements.filter(function (obj) { return obj.action == "delete" });
                  // Restore connections between component model elements
                  let connectionElements = this.getAllConnectionElementsFromComponentModel(elementId);
                  for (let connection of connectionElements) {
                    let sourceId = connection.source.id;
                    let targetId = connection.target.id;
                    if (elementsToBeDeleted.map(a => a.id).indexOf(sourceId) === -1 && elementsToBeDeleted.map(a => a.id).indexOf(targetId) === -1) {
                      if (sourceId && targetId) {
                        let source = this.getElementAfterPasteBasedOnNewConnections(sourceId, this.newConnections[elementId]);
                        let target = this.getElementAfterPasteBasedOnNewConnections(targetId, this.newConnections[elementId]);
                        if (source && target) {
                          if (!this.isThereConnectionBetweenTwoElementsByIds(source.id, target.id)) {
                            this.connectTwoElementsByIdsBasedOnConnections(sourceId, targetId, this.newConnections[elementId]);
                          }
                        }
                      }
                    }
                  }
                  resolve();
                  console.log("END merge of component model " + (i + 1) + "/" + allComponentModelTasks.length);
                  this.consoleLog.push({ type: "normal", msg: "END merge of component model " + (i + 1) + "/" + allComponentModelTasks.length });
                  if (i === allComponentModelTasks.length - 1) {
                    mergeSuccessful();
                  }
                });
              }
            }
          }
        }));
      }
    });
  }

  initResultModeler(): Promise<void> {
    $('#tempResultCanvas, #resultCanvas').html('');
    this.resultModeler = null;
    this.resultFile = JSON.parse(JSON.stringify(this.file));
    return new Promise((resolve, reject) => {
      this.viewer.saveXML(
        {
          format: true
        },
        (err: any, xml: string) => {
          if (err) {
            reject();
          } else {
            this.resultFile.content = xml;
            this.resultModeler = new Modeler({
              container: '#tempResultCanvas',
              moddleExtensions: {
                sqlExt: SqlBPMNModdle
              }
            });
            this.resultModeling = this.resultModeler.get('modeling');
            this.resultClipboard = this.resultModeler.get('clipboard');
            this.resultCopyPaste = this.resultModeler.get('copyPaste');
            this.resultModdle = this.resultModeler.get('moddle');

            if (this.resultFile.content.length > 0) {
              this.resultModeler.importXML(this.resultFile.content, (error, definitions) => {
                if (!error) {
                  this.resultElementRegistry = this.resultModeler.get('elementRegistry');
                  resolve();
                }
              });
            } else {
              reject();
            }
          }
        }
      );
    });
  }

  initResultViewer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.resultViewer = null;
      this.resultModeler.saveXML(
        {
          format: true
        },
        (err: any, xml: string) => {
          if (err || xml.length === 0) {
            reject();
          } else {
            this.resultViewer = new NavigatedViewer({
              container: '#resultCanvas',
              moddleExtensions: {
                sqlExt: SqlBPMNModdle
              }
            });
            this.resultViewer.importXML(xml, (error, definitions) => {
              if (!error) {
                $('#resultCanvas').removeClass('hidden');
                this.resultViewer.get('canvas').zoom('fit-viewport', 'auto');
                resolve();
              } else {
                reject();
              }
            });
          }
        }
      );
    });
  }

  getAllTasksOfComponentModels(): any[] {
    let currentModelTasks = this.resultElementRegistry.filter(function (obj) {
      return obj.type === 'bpmn:Task' && obj.businessObject && obj.businessObject.compositionTaskDetails;
    });
    return currentModelTasks;
  }

  saveElementDetails(elementId: string): void {
    if (elementId && this.elementRegistry.get(elementId) && this.elementRegistry.get(elementId).businessObject) {
      let dataToBeSaved =
      {
        modelId: this.selectedCompositionElement.modelId,
        lastModified: new Date().getTime(),
        selectedModelElements: this.selectedCompositionElement.selectedModelElements,
        xml: this.selectedCompositionElement.xml,
        parentElements: this.selectedCompositionElement.parentElements,
        modelTitle: this.selectedCompositionElement.modelTitle,
        selectedModelConnectionsInfo: this.selectedCompositionElement.selectedModelConnectionsInfo,
        joiningData: { inputs: this.selectedCompositionElement.inputsJoiningData, outputs: this.selectedCompositionElement.outputsJoiningData },
        version: 2
      };
      let dataToBeSavedUpdated = this.createElementLinksBasedOnLabels(dataToBeSaved, elementId); // Connections based on labels are created
      this.elementRegistry.get(elementId).businessObject.compositionTaskDetails = JSON.stringify(dataToBeSavedUpdated);
      this.selectedCompositionElement.savedData = JSON.stringify(dataToBeSavedUpdated);
      this.addCompositionTaskMarker(elementId);
      this.viewer.saveXML(
        {
          format: true
        },
        (err: any, xml: string) => {
          if (err) {
            console.log(err);
            this.consoleLog.push({ type: "error", msg: err });
          } else {
            this.file.title = $('#fileName').val();
            this.file.content = xml;
            if (this.lastContent != this.file.content) {
              $('#save-diagram').addClass('active');
            }
          }
        }
      );
    }
  }

  createElementLinksBasedOnLabels(elementInfo: any, elementId: string): void {
    if (elementInfo) {
      let joiningMatches = this.getInfoOfJoiningInputsAndOutputs(elementInfo.joiningData, elementId);
      for (let element of elementInfo.selectedModelConnectionsInfo) {
        let elem = elementInfo.selectedModelElements.filter((obj) => {
          return obj.id == element.id;
        });
        if (elem.length > 0) {
          elem[0].linkTo = [];
          elem[0].linkFrom = [];
        }
        for (let label of element.linkLabels) {
          let elementId1 = label.id;
          let elementId2 = label.possibleMatch.id;
          let element2Name = label.possibleMatch.name;
          let matches = joiningMatches.filter((match) => {
            return match.oldName == element2Name && match.id == elementId2;
          })
          if (matches.length > 0) {
            element2Name = matches[0].newName;
          }
          let direction = label.possibleMatch.direction;
          let source = label.possibleMatch.source;
          if (label.action != "ignore") {
            this.removeDirectedLinkBetweenElements(elementId1, elementId2, element2Name, direction, source);
            this.linkElementToElement(elementId1, elementId2, element2Name, direction, source);
          }
        }
      }
    }
    return elementInfo;
  }

  getAlreadySavedCompositionDataForElementFromRegistry(elementId: string, registry: any): object {
    if (elementId && registry && registry.get(elementId).businessObject.compositionTaskDetails) {
      return JSON.parse(registry.get(elementId).businessObject.compositionTaskDetails);
    }
    return null;
  }

  loadAlreadySavedCompositionDataForElement(elementId: string): void {
    if (elementId) {
      let savedData = this.getAlreadySavedCompositionDataForElementFromRegistry(elementId, this.elementRegistry);
      if (savedData) {
        this.selectedCompositionElement.savedData = JSON.stringify(savedData);
      }
    }
  }

  initElementSidebarPanel(element: any): void {
    if (element.type === 'bpmn:Task') {
      let elementId = element.businessObject.id;
      let elementName = element.businessObject.name;
      if (this.selectedCompositionElement.title && this.selectedCompositionElement.title != element.businessObject.name) {
        this.selectedCompositionElement = {};
      }
      this.loadAlreadySavedCompositionDataForElement(elementId);
      if (this.selectedCompositionElement.savedData) {
        this.loadSavedComponentModelForElementInRegistry(elementId, this.elementRegistry).then(() => {
          this.selectedCompositionElement.selectedModelElements = JSON.parse(this.selectedCompositionElement.savedData).selectedModelElements;
          this.selectedCompositionElement.modelId = JSON.parse(this.selectedCompositionElement.savedData).modelId;
          this.selectedCompositionElement.modelTitle = JSON.parse(this.selectedCompositionElement.savedData).modelTitle;
          this.selectedCompositionElement.xml = JSON.parse(this.selectedCompositionElement.savedData).xml;
          this.selectedCompositionElement.title = elementName;
          this.selectedCompositionElement.id = elementId;
          this.selectedCompositionElement.parentElements = JSON.parse(this.selectedCompositionElement.savedData).parentElements;
          this.selectedCompositionElement.selectedModelConnectionsInfo = JSON.parse(this.selectedCompositionElement.savedData).selectedModelConnectionsInfo;
          let inputs = this.getTaskInputObjects(element, this.elementRegistry);
          let outputs = this.getTaskOutputObjects(element, this.elementRegistry);
          if (inputs.length > 0) {
            if (JSON.parse(this.selectedCompositionElement.savedData).joiningData && JSON.parse(this.selectedCompositionElement.savedData).joiningData.inputs) {
              this.selectedCompositionElement.inputsJoiningData = JSON.parse(this.selectedCompositionElement.savedData).joiningData.inputs;
            } else {
              let inputsData = [];
              for (let input of inputs) {
                inputsData.push(this.getMatchesForInputOfElement(input, element));
              }
              this.selectedCompositionElement.inputsJoiningData = inputsData;
            }
          }
          if (outputs.length > 0) {
            if (JSON.parse(this.selectedCompositionElement.savedData).joiningData && JSON.parse(this.selectedCompositionElement.savedData).joiningData.outputs) {
              this.selectedCompositionElement.outputsJoiningData = JSON.parse(this.selectedCompositionElement.savedData).joiningData.outputs;
            } else {
              let outputsData = [];
              for (let output of outputs) {
                outputsData.push(this.getMatchesForOutputOfElement(output, element));
              }
              this.selectedCompositionElement.outputsJoiningData = outputsData;
            }
          }
        });
      } else {
        this.selectedCompositionElement.title = elementName;
        this.selectedCompositionElement.id = elementId;
      }
    } else {
      this.selectedCompositionElement = {};
    }
  }

  loadSelectedModelDataForElement(modelId: string, elementId: string): void {
    this.loadComponentModelForElement(modelId, elementId).then(() => {
      this.selectedCompositionElement.modelId = modelId;

      let notConnectionElements = this.getAllNotConnectionElementsFromComponentModel(elementId);
      notConnectionElements = notConnectionElements.concat(this.getAllBoundaryEventElementsFromComponentModel(elementId));

      let filteredNotConnectionElements = notConnectionElements.map(a => {
        let id = a.businessObject.id;
        let name = a.businessObject.name ? a.businessObject.name : modelId + "_undefined";
        let type = a.businessObject.$type;
        let action = "";
        let linkTo = [];
        let linkFrom = [];
        let source = elementId;
        let labels = [];
        if (CompositionModelerComponent.isCompositionLinkElement(a) && a.businessObject && a.businessObject.compositionLinkInfo && JSON.parse(a.businessObject.compositionLinkInfo).labels.length > 0) {
          labels = JSON.parse(a.businessObject.compositionLinkInfo).labels;
        }
        return { id: id, name: name, type: type, action: action, linkTo: linkTo, linkFrom: linkFrom, source: source, labels: labels };
      });

      this.matchLabelsComp.loadConnectionLabelsData(modelId, elementId, notConnectionElements, this.tempElementRegistry);

      this.selectedCompositionElement.selectedModelElements = filteredNotConnectionElements;

      this.selectedCompositionElement.xml = this.tempFile[elementId].content;

      this.selectedCompositionElement.modelTitle = this.tempFile[elementId].title;

      let currentParentId = this.getElementCurrentParent(this.elementRegistry.get(elementId)).id;

      this.selectedCompositionElement.parentElements = this.getAllParentElementsFromModel(elementId).map(a => {
        let id = a.businessObject.id;
        let name = a.businessObject.name ? a.businessObject.name : modelId + "_undefined";
        let matches = currentParentId;
        let type = a.businessObject.$type;
        let parentId = a.parent.id;
        return { id: id, name: name, matches: matches, type: type, parent: parentId };
      });

      let element = this.elementRegistry.get(elementId);
      let inputs = this.getTaskInputObjects(element, this.elementRegistry);
      let outputs = this.getTaskOutputObjects(element, this.elementRegistry);
      if (inputs.length > 0) {
        let inputsData = [];
        for (let input of inputs) {
          inputsData.push(this.getMatchesForInputOfElement(input, element));
        }
        this.selectedCompositionElement.inputsJoiningData = inputsData;
      }
      if (outputs.length > 0) {
        let outputsData = [];
        for (let output of outputs) {
          outputsData.push(this.getMatchesForOutputOfElement(output, element));
        }
        this.selectedCompositionElement.outputsJoiningData = outputsData;
      }

    }, () => {
      this.toastr.error('Selected model cannot be loaded!');
    });
  }


  loadComponentModelForElement(modelId: string, elementId: string): Promise<any> {
    if (this.isInteger(modelId)) {
      this.tempModeler = null;
      return new Promise((resolve, reject) => {
        this.http.get(config.backend.host + '/rest/directories/files/' + modelId, AuthService.loadRequestOptions()).subscribe(
          success => {
            this.tempFile[elementId] = success;
            this.tempModeler = new Modeler({
              container: '#tempCanvas',
              moddleExtensions: {
                sqlExt: SqlBPMNModdle
              }
            });
            if (this.tempFile[elementId].content.length > 0) {
              this.tempModeler.importXML(this.tempFile[elementId].content, () => {
                this.tempElementRegistry[elementId] = this.tempModeler.get('elementRegistry');
                this.tempModeling = this.tempModeler.get('modeling');
                resolve();
              });
            } else {
              reject();
            }
          },
          fail => {
            reject();
          }
        );
      });
    }
  }

  loadSavedComponentModelForElementInRegistry(elementId: string, registry: any): Promise<any> {
    let savedData = this.getAlreadySavedCompositionDataForElementFromRegistry(elementId, registry);
    if (savedData) {
      let savedXml = (<any>savedData).xml;
      this.tempModeler = null;
      return new Promise((resolve, reject) => {
        this.tempModeler = new Modeler({
          container: '#tempCanvas',
          moddleExtensions: {
            sqlExt: SqlBPMNModdle
          }
        });
        if (savedXml.length > 0) {
          this.tempModeler.importXML(savedXml, () => {
            this.tempElementRegistry[elementId] = this.tempModeler.get('elementRegistry');
            this.tempModeling = this.tempModeler.get('modeling');
            resolve();
          });
        } else {
          reject();
        }
      });
    }
  }

  createReviver(moddle: any): any {
    // Source: https://github.com/nikku/bpmn-js-copy-paste-example
    var elCache = {};
    return function (key, object) {
      if (typeof object === 'object' && typeof object.$type === 'string') {
        var objectId = object.id;
        if (objectId && elCache[objectId]) {
          return elCache[objectId];
        }
        var type = object.$type;
        var attrs = Object.assign({}, object);
        delete attrs.$type;
        var newEl = moddle.create(type, attrs);
        if (objectId) {
          elCache[objectId] = newEl;
        }
        return newEl;
      }
      return object;
    };
  }

  getElementCurrentParent(element: any): any {
    let currentParent = null;
    if (element.businessObject && element.businessObject.lanes && element.businessObject.lanes.length > 0) {
      if (element.businessObject.lanes.length === 1) {
        currentParent = element.businessObject.lanes[0];
      } else {
        for (let lane of element.businessObject.lanes) {
          if (!lane.childLaneSet) {
            currentParent = lane;
            break;
          }
        }
      }
    } else if (element.parent && element.parent.id) {
      currentParent = element.parent;
    }
    return currentParent;
  }

  getElementTargetParentBasedOnKnownConnections(element: any, connections: any[]): any {
    let self = this;
    let targetParentId = "";
    let targetParent = connections.filter((obj) => {
      return obj.from === self.getElementCurrentParent(element).id;
    });
    if (targetParent.length > 0) {
      targetParentId = targetParent[0].to;
    }
    return this.resultElementRegistry.get(targetParentId);
  }

  copyAndPasteElementToTargetElement(element: any, targetElement: any, elementId: string): void {
    if (element && targetElement && elementId) {
      let tempNewId = element.businessObject.id = "from_" + elementId + "_" + element.businessObject.id;
      let tempElem = this.tempElementRegistry[elementId].get(element.id);
      this.tempModeling.updateProperties(tempElem, {
        id: tempNewId
      });
      this.resultCopyPaste.copy(tempElem);
      let clipBoardContents = this.resultClipboard.get();
      let reviver = this.createReviver(this.resultModdle);
      if (clipBoardContents && reviver) {
        this.resultClipboard.set(clipBoardContents, reviver);
        let pasteContext = {
          element: targetElement,
          point: { x: targetElement.x + 10, y: targetElement.y + 50 }
        };
        this.resultCopyPaste.paste(pasteContext);
      }
    }
  }

  getAllNotConnectionElementsFromComponentModel(elementId: string): any[] {
    return this.tempElementRegistry[elementId].filter(function (obj) {
      return obj.type !== 'bpmn:DataInputAssociation' && obj.type !== 'bpmn:DataOutputAssociation' && obj.type !== 'bpmn:SequenceFlow' && obj.type !== 'bpmn:Lane' && obj.type !== 'bpmn:Participant' && obj.type !== 'bpmn:Collaboration' && obj.type !== 'label' && obj.type !== 'bpmn:MessageFlow' && obj.type !== 'bpmn:Association' && obj.type !== 'bpmn:MessageEventDefinition' && obj.type !== 'bpmn:BoundaryEvent';
    });
  }

  getAllBoundaryEventElementsFromComponentModel(elementId: string): any[] {
    return this.tempElementRegistry[elementId].filter(function (obj) {
      return obj.type === 'bpmn:BoundaryEvent'
    });
  }

  getAllConnectionElementsFromComponentModel(elementId: string): any[] {
    return this.tempElementRegistry[elementId].filter(function (obj) {
      return obj.type === 'bpmn:SequenceFlow' || obj.type === 'bpmn:MessageFlow' || obj.type === 'bpmn:DataInputAssociation' || obj.type === 'bpmn:DataOutputAssociation' || obj.type === 'bpmn:Association' || obj.type === 'bpmn:MessageEventDefinition';
    });
  }

  getAllParentElementsFromModel(elementId: string): any[] {
    return this.tempElementRegistry[elementId].filter(function (obj) {
      return obj.type === 'bpmn:Participant' || obj.type === 'bpmn:Lane';
    });
  }

  getAllParentElementsOfCurrentModel(): any[] {
    return this.elementRegistry.filter(function (obj) {
      return obj.type === 'bpmn:Participant' || obj.type === 'bpmn:Lane';
    }).map(a => {
      return { id: a.businessObject.id, name: a.businessObject.name, type: a.businessObject.$type, parent: a.parent.id };
    }
    );
  }

  getPastedElementIdByCopiedElementIdAndName(copiedElementId: string, copiedElementName: string, elementId: string): string {
    let newElemId = this.resultElementRegistry.filter((obj) => {
      return obj.oldBusinessObject && obj.oldBusinessObject.id && obj.oldBusinessObject.id == "from_" + elementId + "_" + copiedElementId && obj.oldBusinessObject.name == copiedElementName;
    });
    if (newElemId.length > 0) {
      return newElemId[0].id;
    }
    return null;
  }

  getPastedChildElementIdByCopiedElementIdAndName(copiedElementId: string, copiedElementName: string, parentId: string): string {
    let newElemId = this.resultElementRegistry.filter((obj) => {
      return obj.oldBusinessObject && obj.oldBusinessObject.id == copiedElementId && obj.oldBusinessObject.name == copiedElementName && obj.oldBusinessObject.$parent.id == parentId;
    });
    if (newElemId.length > 0) {
      return newElemId[0].id;
    }
    return null;
  }

  getInfoOfJoiningInputsAndOutputs(joiningData: any, elementId: string) {
    let joiningMatches = [];
    let inputsJoiningMatches = undefined;
    let outputsJoiningMatches = undefined;
    if (joiningData) {
      if (joiningData.inputs) {
        let inputMatches = joiningData.inputs.filter((data) => {
          return data.elementId == elementId && data.match;
        })
        if (inputMatches.length > 0) {
          inputsJoiningMatches = inputMatches.map((info) => {
            return { oldName: info.match.name, oldId: info.match.id, newName: info.input.name, id: info.input.id };
          });
          joiningMatches = joiningMatches.concat(inputsJoiningMatches);
        }
      }
      if (joiningData.outputs) {
        let outputMatches = joiningData.outputs.filter((data) => {
          return data.elementId == elementId && data.match;
        })
        if (outputMatches.length > 0) {
          outputsJoiningMatches = outputMatches.map((info) => {
            return { oldName: info.match.name, oldId: info.match.id, newName: info.input.name, id: info.input.id };
          });
          joiningMatches = joiningMatches.concat(outputsJoiningMatches);
        }
      }
    }
    return joiningMatches;
  }

  loadNewConnectionsAfterCopyPasteAndMergeOfComponentModel(connections: any[], elementId: string, selectedModelElements: any[], modelId: string, joiningData: any): any[] {
    if (!this.newConnections[elementId]) {
      this.newConnections[elementId] = [];
    }

    let prefix = elementId.substring(5) + "_" + modelId + "|";
    let elements = this.getAllNotConnectionElementsFromComponentModel(elementId).reverse();
    elements = elements.concat(this.getAllBoundaryEventElementsFromComponentModel(elementId));
    let elementsToBeDeleted = selectedModelElements.filter(function (obj) { return obj.action == "delete" }); // TODO: find a better way how to store and use elementsToBeDeleted info!
    if (!this.lastMergedElementsForElement[elementId]) {
      this.lastMergedElementsForElement[elementId] = [];
    }
    let joiningMatches = this.getInfoOfJoiningInputsAndOutputs(joiningData, elementId);

    for (let element of elements) {
      if (element && elementsToBeDeleted.map(a => a.id).indexOf(element.id) === -1) { // Filter out elements that have been marked to be deleted

        let def = undefined;
        if (element.type === 'bpmn:ExclusiveGateway') {
          if (element.businessObject.default) {
            def = element.businessObject.default;
          }
        }

        let sourceParent = this.getElementCurrentParent(element);
        let targetParent = this.getElementTargetParentBasedOnKnownConnections(element, connections);

        if (sourceParent && targetParent) {

          this.copyAndPasteElementToTargetElement(element, targetParent, elementId);

          let fromName = element.businessObject.name;
          let newElemId = this.getPastedElementIdByCopiedElementIdAndName(element.id, fromName, elementId);
          if (newElemId) {
            this.addPrefixToElementNameByElementIdAfterPaste(newElemId, prefix, joiningMatches);
            this.renameScriptForElement(newElemId, prefix, joiningMatches);
            let newElemName = this.resultElementRegistry.get(newElemId).businessObject.name ? this.resultElementRegistry.get(newElemId).businessObject.name : modelId + "_undefined";
            let connectionsInfo = { fromParent: sourceParent.id, toParent: targetParent.id, from: element.id, to: newElemId, fromName: fromName, toName: newElemName, fromModelId: modelId, source: elementId, def: {} };
            if (def) {
              if (def.sourceRef && def.targetRef) {
                let defInfo = { target: def.targetRef.id, source: elementId };
                connectionsInfo.def = defInfo;
              }
            }
            this.newConnections[elementId].push(connectionsInfo);
            this.lastMergedElementsForElement[elementId].push(connectionsInfo);
            if (element.type === 'bpmn:SubProcess') {
              let cParentElementId = "from_" + elementId + "_" + element.id;
              for (let child of element.children) {
                let cFromName = child.businessObject.name;
                let cDef = undefined;
                if (child.type === 'bpmn:ExclusiveGateway') {
                  if (child.businessObject.default) {
                    cDef = child.businessObject.default;
                  }
                }
                let cNewElemId = this.getPastedChildElementIdByCopiedElementIdAndName(child.id, cFromName, cParentElementId);
                if (cNewElemId) {
                  this.addPrefixToElementNameByElementIdAfterPaste(cNewElemId, prefix, joiningMatches);
                  this.renameScriptForElement(cNewElemId, prefix, joiningMatches);
                  let cNewElemName = this.resultElementRegistry.get(cNewElemId).businessObject.name ? this.resultElementRegistry.get(cNewElemId).businessObject.name : modelId + "_undefined";
                  let cConnectionsInfo = { fromParent: element.id, toParent: newElemId, from: child.id, to: cNewElemId, fromName: cFromName, toName: cNewElemName, fromModelId: modelId, source: elementId, def: {} };
                  if (cDef) {
                    if (cDef.sourceRef && cDef.targetRef) {
                      let cDefInfo = { target: cDef.targetRef.id, source: elementId };
                      cConnectionsInfo.def = cDefInfo;
                    }
                  }
                  this.newConnections[elementId].push(cConnectionsInfo);
                  this.lastMergedElementsForElement[elementId].push(cConnectionsInfo);
                }
              }
            }
          }

        }
      }
    }
    for (let element of elements) {
      if (element.type === "bpmn:Task") {
        let elem = this.getElementAfterPasteBasedOnNewConnections(element.id, this.newConnections[elementId]);

        // SKEncrypt
        if (element.businessObject.SKEncrypt) {
          let encDetails = JSON.parse(element.businessObject.SKEncrypt);
          let keyId = this.getElementAfterPasteBasedOnNewConnections(encDetails.key, this.newConnections[elementId]);
          let plainTextId = this.getElementAfterPasteBasedOnNewConnections(encDetails.inputData, this.newConnections[elementId]);
          if (elem && elem.businessObject && elem.businessObject.SKEncrypt) {
            let newKeyId = keyId ? keyId.id : encDetails.key;
            let newPlainTextId = plainTextId ? plainTextId.id : encDetails.inputData;
            if (!keyId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == encDetails.key;
                })
                if (matches.length > 0) {
                  newKeyId = matches[0].id;
                }
              }
            }
            if (!plainTextId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == encDetails.inputData;
                })
                if (matches.length > 0) {
                  newPlainTextId = matches[0].id;
                }
              }
            }
            if (this.resultElementRegistry.get(elem.id)) {
              this.resultElementRegistry.get(elem.id).businessObject.SKEncrypt = JSON.stringify({ key: newKeyId, inputData: newPlainTextId });
            }
          }
        }

        // SKDecrypt
        if (element.businessObject.SKDecrypt) {
          let decDetails = JSON.parse(element.businessObject.SKDecrypt);
          let keyId = this.getElementAfterPasteBasedOnNewConnections(decDetails.key, this.newConnections[elementId]);
          let cipherTextId = this.getElementAfterPasteBasedOnNewConnections(decDetails.ciphertext, this.newConnections[elementId]);
          if (elem && elem.businessObject && elem.businessObject.SKDecrypt) {
            let newKeyId = keyId ? keyId.id : decDetails.key;
            let newCipherTextId = cipherTextId ? cipherTextId.id : decDetails.ciphertext;

            if (!keyId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == decDetails.key;
                })
                if (matches.length > 0) {
                  newKeyId = matches[0].id;
                }
              }
            }
            if (!cipherTextId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == decDetails.ciphertext;
                })
                if (matches.length > 0) {
                  newCipherTextId = matches[0].id;
                }
              }
            }

            if (this.resultElementRegistry.get(elem.id)) {
              this.resultElementRegistry.get(elem.id).businessObject.SKDecrypt = JSON.stringify({ key: newKeyId, ciphertext: newCipherTextId });
            }
          }
        }

        // PKEncrypt
        if (element.businessObject.PKEncrypt) {
          let encDetails = JSON.parse(element.businessObject.PKEncrypt);
          let keyId = this.getElementAfterPasteBasedOnNewConnections(encDetails.key, this.newConnections[elementId]);
          let plainTextId = this.getElementAfterPasteBasedOnNewConnections(encDetails.inputData, this.newConnections[elementId]);
          if (elem && elem.businessObject && elem.businessObject.PKEncrypt) {
            let newKeyId = keyId ? keyId.id : encDetails.key;
            let newPlainTextId = plainTextId ? plainTextId.id : encDetails.inputData;
            if (!keyId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == encDetails.key;
                })
                if (matches.length > 0) {
                  newKeyId = matches[0].id;
                }
              }
            }
            if (!plainTextId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == encDetails.inputData;
                })
                if (matches.length > 0) {
                  newPlainTextId = matches[0].id;
                }
              }
            }
            if (this.resultElementRegistry.get(elem.id)) {
              this.resultElementRegistry.get(elem.id).businessObject.PKEncrypt = JSON.stringify({ key: newKeyId, inputData: newPlainTextId });
            }
          }
        }

        // PKDecrypt
        if (element.businessObject.PKDecrypt) {
          let decDetails = JSON.parse(element.businessObject.PKDecrypt);
          let keyId = this.getElementAfterPasteBasedOnNewConnections(decDetails.key, this.newConnections[elementId]);
          let cipherTextId = this.getElementAfterPasteBasedOnNewConnections(decDetails.ciphertext, this.newConnections[elementId]);

          if (elem && elem.businessObject && elem.businessObject.PKDecrypt) {
            let newKeyId = keyId ? keyId.id : decDetails.key;
            let newCipherTextId = cipherTextId ? cipherTextId.id : decDetails.ciphertext;
            if (!keyId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == decDetails.key;
                })
                if (matches.length > 0) {
                  newKeyId = matches[0].id;
                }
              }
            }
            if (!cipherTextId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == decDetails.ciphertext;
                })
                if (matches.length > 0) {
                  newCipherTextId = matches[0].id;
                }
              }
            }
            if (this.resultElementRegistry.get(elem.id)) {
              this.resultElementRegistry.get(elem.id).businessObject.PKDecrypt = JSON.stringify({ key: newKeyId, ciphertext: newCipherTextId });
            }
          }
        }

        // ABEncrypt
        if (element.businessObject.ABEncrypt) {
          let encDetails = JSON.parse(element.businessObject.ABEncrypt);
          let keyId = this.getElementAfterPasteBasedOnNewConnections(encDetails.key, this.newConnections[elementId]);
          let plainTextId = this.getElementAfterPasteBasedOnNewConnections(encDetails.inputData, this.newConnections[elementId]);
          if (elem && elem.businessObject && elem.businessObject.ABEncrypt) {
            let newKeyId = keyId ? keyId.id : encDetails.key;
            let newPlainTextId = plainTextId ? plainTextId.id : encDetails.inputData;
            if (!keyId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == encDetails.key;
                })
                if (matches.length > 0) {
                  newKeyId = matches[0].id;
                }
              }
            }
            if (!plainTextId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == encDetails.inputData;
                })
                if (matches.length > 0) {
                  newPlainTextId = matches[0].id;
                }
              }
            }
            if (this.resultElementRegistry.get(elem.id)) {
              this.resultElementRegistry.get(elem.id).businessObject.ABEncrypt = JSON.stringify({ key: newKeyId, inputData: newPlainTextId, attributeSubSet: encDetails.attributeSubSet });
            }
          }
        }

        // ABDecrypt
        if (element.businessObject.ABDecrypt) {
          let decDetails = JSON.parse(element.businessObject.ABDecrypt);
          let keyId = this.getElementAfterPasteBasedOnNewConnections(decDetails.key, this.newConnections[elementId]);
          let cipherTextId = this.getElementAfterPasteBasedOnNewConnections(decDetails.ciphertext, this.newConnections[elementId]);

          if (elem && elem.businessObject && elem.businessObject.ABDecrypt) {
            let newKeyId = keyId ? keyId.id : decDetails.key;
            let newCipherTextId = cipherTextId ? cipherTextId.id : decDetails.ciphertext;
            if (!keyId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == decDetails.key;
                })
                if (matches.length > 0) {
                  newKeyId = matches[0].id;
                }
              }
            }
            if (!cipherTextId) {
              if (joiningMatches && joiningMatches.length > 0) {
                let matches = joiningMatches.filter((match) => {
                  return match.oldId == decDetails.ciphertext;
                })
                if (matches.length > 0) {
                  newCipherTextId = matches[0].id;
                }
              }
            }
            if (this.resultElementRegistry.get(elem.id)) {
              this.resultElementRegistry.get(elem.id).businessObject.ABDecrypt = JSON.stringify({ key: newKeyId, ciphertext: newCipherTextId });
            }
          }
        }
      }
    }
    return this.newConnections[elementId];
  }

  renameScriptForElement(elementId: string, prefix: string, joiningMatches: any[]): void {
    let regex = new RegExp(/\b(?<!\.|\")[A-Za-z0-9_[\]]+(?!\(|\")\b/, 'gm');
    if (elementId && prefix) {
      let element = this.resultElementRegistry.get(elementId);
      if (element && element.businessObject && element.businessObject.sqlScript) {
        element.businessObject.sqlScript = element.businessObject.sqlScript.replace(regex, (x) => {
          if (joiningMatches && joiningMatches.length > 0) {
            let matches = joiningMatches.filter((match) => {
              return match.oldName == x;
            })
            if (matches.length > 0) {
              return matches[0].newName;
            }
          }
          return prefix + x;
        });
        // console.log(element.businessObject.sqlScript)
        // this.consoleLog.push({ type: "normal", msg: element.businessObject.sqlScript});
      }
    }
  }

  addPrefixToElementNameByElementIdAfterPaste(elementId: string, prefix: string, joiningMatches: any[]): void {
    if (elementId && prefix) {
      let element = this.resultElementRegistry.get(elementId);
      if (element && element.businessObject) {
        let currentName = element.businessObject.name ? element.businessObject.name : "undefined";
        let newName = prefix + currentName;
        if (joiningMatches && joiningMatches.length > 0) {
          let matches = joiningMatches.filter((match) => {
            return match.oldName == currentName;
          })
          if (matches.length > 0) {
            newName = matches[0].newName;
          }
        }
        this.resultModeling.updateProperties(element, {
          name: newName
        });
      }
    }

  }

  getElementAfterPasteBasedOnNewConnections(elementId: any, connections: any[]): any {
    let connection = connections.filter(function (obj) {
      return obj.from === elementId;
    });
    if (connection.length > 0) {
      return this.resultElementRegistry.get(connection[0].to);
    }
  }

  connectTwoElementsByIdsBasedOnConnections(element1Id: string, element2Id: string, connections: any[]): void {
    if (element1Id && element2Id) {
      let sourceElement = this.getElementAfterPasteBasedOnNewConnections(element1Id, connections);
      let targetElement = this.getElementAfterPasteBasedOnNewConnections(element2Id, connections);
      if (sourceElement && targetElement) {
        this.connectTwoElements(sourceElement, targetElement);
      }
    }
  }

  connectTwoElementsByIds(element1Id: string, element2Id: string): void {
    if (element1Id && element2Id) {
      let source = this.resultElementRegistry.get(element1Id);
      let target = this.resultElementRegistry.get(element2Id);
      if (source && target) {
        this.connectTwoElements(source, target);
      }
    }
  }

  connectTwoElements(element1: any, element2: any): void {
    this.resultModeling.connect(element1, element2);
  }

  removeElement(element: any): void {
    if (element) {
      this.resultModeling.removeShape(element);
    }
  }

  removeElementById(elementId: string): void {
    if (elementId && this.resultElementRegistry.get(elementId)) {
      this.removeElement(this.resultElementRegistry.get(elementId));
    }
  }

  removeConnection(connection: any): void {
    if (connection && connection.businessObject && connection.businessObject.id) {
      if (this.resultElementRegistry.get(connection.businessObject.id)) {
        this.resultModeling.removeConnection(connection);
      }
    }
  }

  removeConnectionBetweenTwoElementsByIds(element1Id: string, element2Id: string): void {
    if (element1Id && element2Id) {
      let source = this.resultElementRegistry.get(element1Id);
      let target = this.resultElementRegistry.get(element2Id);
      if (source && target) {
        let connections = this.resultElementRegistry.filter((element) => {
          return element.type === "bpmn:Association" || element.type === "bpmn:SequenceFlow" || element.type === "bpmn:MessageFlow" || element.type === "bpmn:DataInputAssociation" || element.type === "bpmn:DataOutputAssociation";
        });
        for (let connection of connections) {
          if (connection.source && connection.target && connection.source.id && connection.target.id && connection.source.id == element1Id && connection.target.id == element2Id) {
            this.removeConnection(connection);
          }
        }
      }
    }
  }

  isThereConnectionBetweenTwoElementsByIds(element1Id: string, element2Id: string): boolean {
    if (element1Id && element2Id) {
      let source = this.resultElementRegistry.get(element1Id);
      let target = this.resultElementRegistry.get(element2Id);
      if (source && target) {
        let connections = this.resultElementRegistry.filter((element) => {
          return element.type === "bpmn:Association" || element.type === "bpmn:SequenceFlow" || element.type === "bpmn:MessageFlow" || element.type === "bpmn:DataInputAssociation" || element.type === "bpmn:DataOutputAssociation";
        });
        for (let connection of connections) {
          if (connection.source && connection.target && connection.source.id && connection.target.id && connection.source.id == element1Id && connection.target.id == element2Id) {
            return true;
          }
        }
      }
    }
    return false;
  }

  loadMergedExportButton(): void {
    let self = this;
    if ($('#fileName').val() && $('#fileName').val().length > 0) {
      self.resultFile.title = $('#fileName').val();
    }
    self.resultViewer.saveXML({ format: true }, (err, xml) => {
      let encodedData = encodeURIComponent(xml);
      if (xml) {
        if (self.canEdit()) {
          self.resultFile.content = xml;
        }
        $('#download-merged-diagram').attr({
          'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
          'download': "merged_" + self.resultFile.title
        });
      }
    });
  }

  loadCompositionTaskMarkers(): void {
    let elements = this.elementRegistry.filter((obj) => {
      return obj.businessObject && obj.businessObject.compositionTaskDetails;
    });
    for (let element of elements) {
      this.addCompositionTaskMarker(element.businessObject.id);
    }
  }

  addCompositionTaskMarker(elementId: string): void {
    if (elementId) {
      this.canvas.addMarker(elementId, 'highlight-component-task');
    }
  }

  /////////////////////////////////////


  loadCompositionLinkElementMarkers(): void {
    let self = this;
    let elements = this.elementRegistry.filter((obj) => {
      return CompositionModelerComponent.isCompositionLinkElement(obj) && obj.businessObject && obj.businessObject.compositionLinkInfo;
    });
    for (let element of elements) {
      if (element.businessObject && element.businessObject.compositionLinkInfo && JSON.parse(element.businessObject.compositionLinkInfo).labels) {
        this.reloadCompositionLinkElementMarkers(element.businessObject.id, JSON.parse(element.businessObject.compositionLinkInfo).labels);
      }
    }
  }

  removeCompositionLinkElementMarker(elementId: string): void {
    if (elementId && this.compositionElementMarkers[elementId]) {
      this.overlays.remove(this.compositionElementMarkers[elementId]);
    }
  }

  reloadCompositionLinkElementMarkers(elementId: string, labels: any): void {
    if (elementId && labels && labels.length > 0) {
      this.removeCompositionLinkElementMarker(elementId);
      let fullLabel = labels[0].label;
      if (labels.length > 1) {
        fullLabel = "multiple labels";
      } else if (labels.length === 1) {
        let label = labels[0];
        let fromLabel = label.linkFrom && !label.linkTo ? "(>)" : "";
        let toLabel = label.linkTo && !label.linkFrom ? "(>)" : "";
        let bothLabels = label.linkFrom && label.linkTo ? "(<>)" : "";
        fullLabel = toLabel + label.label + fromLabel + bothLabels;
      }
      let taskTypeLabel = $(
        `<div style="padding:5px; border-radius:2px; font-size:12px; color: purple">
             <b>` + fullLabel + `</b>
           </div>`
      );
      this.compositionElementMarkers[elementId] = this.overlays.add(this.elementRegistry.get(elementId), {
        position: {
          bottom: 0,
          left: -5
        },
        show: {
          minZoom: 0,
          maxZoom: 5.0
        },
        html: taskTypeLabel
      });
    } else if (elementId && labels && labels.length === 0) {
      this.removeCompositionLinkElementMarker(elementId);
    }
  }

  saveLinkElementDetails(elementId: string): void {
    if (elementId && this.elementRegistry.get(elementId) && this.elementRegistry.get(elementId).businessObject) {
      this.selectedCompositionLinkElement.labels = this.selectedCompositionLinkElement.labels.filter((obj) => {
        return obj.label !== "";
      });
      for (let label of this.selectedCompositionLinkElement.labels) {
        if (this.selectedCompositionLinkElement.connectionsType == "outgoing") {
          label.linkFrom = true;
          label.linkTo = false;
        } else if (this.selectedCompositionLinkElement.connectionsType == "incoming") {
          label.linkFrom = false;
          label.linkTo = true;
        }
      }
      let dataToBeSaved =
      {
        id: elementId,
        lastModified: new Date().getTime(),
        labels: this.selectedCompositionLinkElement.labels
      };
      this.elementRegistry.get(elementId).businessObject.compositionLinkInfo = JSON.stringify(dataToBeSaved);
      this.selectedCompositionLinkElement.savedData = JSON.stringify(dataToBeSaved);
      this.reloadCompositionLinkElementMarkers(elementId, this.selectedCompositionLinkElement.labels);
      this.viewer.saveXML(
        {
          format: true
        },
        (err: any, xml: string) => {
          if (err) {
            console.log(err);
            this.consoleLog.push({ type: "error", msg: err });
          } else {
            this.file.title = $('#fileName').val();
            this.file.content = xml;
            if (this.lastContent != this.file.content) {
              $('#save-diagram').addClass('active');
            }
          }
        }
      );
    }
  }

  canRemoveLinkElementDetails(elementId: string): boolean {
    if (elementId && this.elementRegistry.get(elementId) && this.elementRegistry.get(elementId).businessObject && this.elementRegistry.get(elementId).businessObject.compositionLinkInfo) {
      return true;
    }
    return false;
  }

  removeLinkElementDetails(elementId: string): void {
    if (this.canRemoveLinkElementDetails(elementId) && confirm('Are you sure you wish to remove all labels from this element?')) {
      delete this.elementRegistry.get(elementId).businessObject.compositionLinkInfo;
      this.removeCompositionLinkElementMarker(elementId);
      this.selectedCompositionLinkElement = {};
      this.viewer.saveXML(
        {
          format: true
        },
        (err: any, xml: string) => {
          if (err) {
            console.log(err);
            this.consoleLog.push({ type: "error", msg: err });
          } else {
            this.file.title = $('#fileName').val();
            this.file.content = xml;
            if (this.lastContent != this.file.content) {
              $('#save-diagram').addClass('active');
            }
          }
        }
      );
    }
  }

  getAlreadySavedCompositionLinkDataForElementFromRegistry(elementId: string, registry: any): object {
    if (elementId && registry && registry.get(elementId).businessObject.compositionLinkInfo) {
      return JSON.parse(registry.get(elementId).businessObject.compositionLinkInfo);
    }
    return null;
  }

  loadAlreadySavedCompositionLinkDataForElement(elementId: string): void {
    if (elementId) {
      let savedData = this.getAlreadySavedCompositionLinkDataForElementFromRegistry(elementId, this.elementRegistry);
      if (savedData) {
        this.selectedCompositionLinkElement.savedData = JSON.stringify(savedData);
      }
    }
  }

  initElementLinkingSidebarPanel(element: any): void {
    if (element && CompositionModelerComponent.isCompositionLinkElement(element)) {
      let elementId = element.businessObject.id;
      let elementName = element.businessObject.name ? element.businessObject.name : "undefined";
      let label = { id: elementId, name: elementName, lastModified: new Date().getTime(), label: "", linkTo: false, linkFrom: false };
      let elementConnectionsType = "both";
      if (element.businessObject.$type) {
        if (element.businessObject.$type === "bpmn:StartEvent" && !element.businessObject.eventDefinitions) {
          elementConnectionsType = "outgoing";
        } else if (element.businessObject.$type === "bpmn:EndEvent" && !element.businessObject.eventDefinitions) {
          elementConnectionsType = "incoming";
        }
      }
      if (this.selectedCompositionLinkElement.title && this.selectedCompositionLinkElement.title != element.businessObject.name) {
        this.selectedCompositionLinkElement = {};
      }
      this.loadAlreadySavedCompositionLinkDataForElement(elementId);
      if (this.selectedCompositionLinkElement.savedData) {
        let savedData = JSON.parse(this.selectedCompositionLinkElement.savedData);
        this.selectedCompositionLinkElement.labels = savedData.labels;
        if (!savedData.labels || savedData.labels && savedData.labels.length === 0) {
          this.selectedCompositionLinkElement.labels = [label];
        }
        this.selectedCompositionLinkElement.title = elementName;
        this.selectedCompositionLinkElement.id = elementId;
        this.selectedCompositionLinkElement.connectionsType = elementConnectionsType;
      } else {
        this.selectedCompositionLinkElement.labels = [label];
        this.selectedCompositionLinkElement.title = elementName;
        this.selectedCompositionLinkElement.id = elementId;
        this.selectedCompositionLinkElement.connectionsType = elementConnectionsType;
      }
    } else {
      this.selectedCompositionLinkElement = {};
    }
  }

  static isCompositionLinkElement(element: any): boolean {
    if (element && element.type && (
      element.type === "bpmn:Task" ||
      element.type === "bpmn:DataObjectReference" ||
      element.type === "bpmn:DataStoreReference" ||
      element.type === "bpmn:StartEvent" ||
      element.type === "bpmn:EndEvent" ||
      element.type === "bpmn:BoundaryEvent" ||
      element.type === "bpmn:IntermediateCatchEvent" ||
      element.type === "bpmn:IntermediateThrowEvent" ||
      element.type === "bpmn:ExclusiveGateway" ||
      element.type === "bpmn:InclusiveGateway" ||
      element.type === "bpmn:ParallelGateway" ||
      element.type === "bpmn:ComplexGateway") ||
      element.type === "bpmn:SubProcess") {
      return true;
    }
    return false;
  }

  getElementNameById(elementId: string): any {
    if (elementId) {
      if (this.elementRegistry.get(elementId) && this.elementRegistry.get(elementId).businessObject && this.elementRegistry.get(elementId).businessObject.name) {
        return this.elementRegistry.get(elementId).businessObject.name;
      }
    }
  }

  /////////////////////////////////////

  loadModel(): void {
    let self = this;
    self.viewer = null;
    $('#canvas').html('');
    $('.buttons-container').off('click', '#save-diagram');
    $('.buttons-container').off('click', '.buttons a');
    $(window).off('keydown');
    $(window).off('mouseup');
    self.http.get(config.backend.host + '/rest/directories/files/' + self.modelId, AuthService.loadRequestOptions()).subscribe(
      success => {
        self.file = success;
        self.fileId = self.file.id;
        if (self.file.content.length !== 0) {
          self.openDiagram(self.file.content).then(() => {
            this.eventBus.on('element.click', (e) => {
              console.log(e.element)
              this.initElementSidebarPanel(e.element);
              this.initElementLinkingSidebarPanel(e.element);
            });
          }, () => {
            this.toastr.error('File cannot be opened!', '', { disableTimeOut: true });
          });
        } else {
          this.toastr.error('File is empty!', '', { disableTimeOut: true });
        }
        self.lastContent = self.file.content;
        document.title = 'Pleak editor - ' + self.file.title;
        self.lastModified = new Date().getTime();
        self.fileLoaded = true;
      },
      fail => {
        self.fileId = null;
        self.file = null;
        self.lastContent = '';
        $('.buttons-container').on('click', '.buttons a', (e) => {
          if (!$(e.target).is('.active')) {
            e.preventDefault();
            e.stopPropagation();
          }
        });

        this.toastr.error('File cannot be found or opened!', '', { disableTimeOut: true });

      }
    );
  }

  isInteger(value: any): boolean {
    value = Number(value);
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
  }

  openDiagram(diagram: string): Promise<any> {

    if (diagram && this.viewer == null) {

      return new Promise((resolve, reject) => {

        this.viewer = new NavigatedViewer({
          container: '#canvas',
          keyboard: {
            bindTo: document
          },
          moddleExtensions: {
            sqlExt: SqlBPMNModdle
          }
        });

        this.eventBus = this.viewer.get('eventBus');
        this.elementRegistry = this.viewer.get('elementRegistry');
        this.overlays = this.viewer.get('overlays');
        this.canvas = this.viewer.get('canvas');

        this.viewer.importXML(diagram, (error, definitions) => {
          if (!error) {
            this.viewer.get('canvas').zoom('fit-viewport', 'auto');
            this.loadExportButtons();

            $('.buttons-container').on('click', '#save-diagram', (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.save();
            });

            $('.buttons-container').on('click', '.buttons a', (e) => {
              if (!$(e.target).is('.active')) {
                e.preventDefault();
                e.stopPropagation();
              }
            });

            $(window).on('keydown', (e) => {
              if (e.ctrlKey || e.metaKey) {
                switch (String.fromCharCode(e.which).toLowerCase()) {
                  case 's':
                    event.preventDefault();
                    this.save();
                    break;
                }
              }
            });

            $(window).bind('beforeunload', () => {
              if (this.file.content != this.lastContent) {
                return 'Are you sure you want to close this tab? Unsaved progress will be lost.';
              }
            });

            this.viewer.on('commandStack.changed', () => {
              this.loadExportButtons();
              $('#save-diagram').addClass('active');
            });

            $(document).on('input', '#fileName', () => {
              this.loadExportButtons();
              $('#save-diagram').addClass('active');
            });

            this.loadCompositionLinkElementMarkers();
            this.loadCompositionTaskMarkers();

            resolve();
          } else {
            this.toastr.error('File cannot be opened!', '', { disableTimeOut: true });
            this.loadModel();
            reject();
          }
        });
      });
    }
  }

  // Save model
  save(): void {
    let self = this;
    if ($('#save-diagram').is('.active')) {
      self.viewer.saveXML(
        {
          format: true
        },
        (err: any, xml: string) => {
          if (err) {
            console.log(err);
            this.consoleLog.push({ type: "error", msg: err });
          } else {
            self.file.title = $('#fileName').val();
            self.file.content = xml;
            self.http.put(config.backend.host + '/rest/directories/files/' + self.fileId, self.file, AuthService.loadRequestOptions({ observe: 'response' })).subscribe(
              (success: any) => {
                if (success.status === 200 || success.status === 201) {
                  let data = success.body;
                  $('.error-message').hide();
                  $('#save-diagram').removeClass('active');

                  this.toastr.success('File saved');
                  let date = new Date();
                  self.lastModified = date.getTime();
                  localStorage.setItem("lastModifiedFileId", '"' + data.id + '"');
                  localStorage.setItem("lastModified", '"' + date.getTime() + '"');
                  if (self.fileId !== data.id) {
                    this.router.navigate(['modeler', data.id]);
                  }
                  self.file.md5Hash = data.md5Hash;
                  self.lastContent = self.file.content;
                  self.fileId = data.id;
                  document.title = 'Pleak editor - ' + self.file.title;
                }
              },
              (fail: HttpResponse<any>) => {
                if (fail.status === 400) {
                  this.toastr.error('Incorrect file name, please use symbols: a-z, A-Z, 0-9, ".", "-", "_"');
                } else if (fail.status === 401) {
                  $('#loginModal').modal();
                } else if (fail.status === 409) {
                  delete self.file.id;
                  if (parseInt(jwt_decode(localStorage.jwt).sub) !== self.file.user.id) {
                    delete self.file.directory.id;
                    self.file.directory.title = 'root';
                  }
                  this.toastr.error('File has changed on the server. Please set new file name to save a copy.');
                }
              }
            );
          }
        });
    }
  }

  loadExportButtons(): void {
    let self = this;
    if ($('#fileName').val() && $('#fileName').val().length > 0) {
      self.file.title = $('#fileName').val();
    }
    self.viewer.saveSVG((err, svg) => {
      let encodedData = encodeURIComponent(svg);
      if (svg) {
        if (self.canEdit()) {
          self.file.content = svg;
        }
        $('#download-svg').addClass('active').attr({
          'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
          'download': self.file.title + '.svg'
        });
      } else {
        $('#download-svg').removeClass('active');
      }
    });
    self.viewer.saveXML({ format: true }, (err, xml) => {
      let encodedData = encodeURIComponent(xml);
      if (xml) {
        if (self.canEdit()) {
          self.file.content = xml;
        }
        $('#download-diagram').addClass('active').attr({
          'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
          'download': self.file.title
        });
      } else {
        $('#download-diagram').removeClass('active');
      }
    });
  }

  initLoginModal(): void {
    this.authService.initLoginModal();
  }

  initLogoutModal(): void {
    this.authService.initLogoutModal();
  }

  isOwner(pobject): boolean {
    return this.authService.user ? pobject.user.id === parseInt(this.authService.user.sub) : false;
  };

  canEdit(): boolean {
    if (this.file != null && this.authService.user != null) {
      let file = this.file;
      if (this.isOwner(file)) return true;
      for (let pIx = 0; pIx < file.permissions.length; pIx++) {
        if (file.permissions[pIx].action.title === 'edit' && this.authService.user ? file.permissions[pIx].user.id === parseInt(this.authService.user.sub) : false) {
          return true;
        }
      }
      return false;
    }
    return false;
  }

  isXML(xml): boolean {
    try {
      $.parseXML(xml);
      return true;
    } catch (err) {
      return false;
    }
  }

  ngOnInit(): void {
    window.addEventListener('storage', (event: StorageEvent) => {
      if (event.storageArea === localStorage) {
        if (!this.authService.verifyToken()) {
          this.loadModel();
        } else {
          let lastModifiedFileId = Number(localStorage.getItem('lastModifiedFileId').replace(/['"]+/g, ''));
          let currentFileId = null;
          if (this.file) {
            currentFileId = this.file.id;
          }
          let localStorageLastModifiedTime = Number(localStorage.getItem('lastModified').replace(/['"]+/g, ''));
          let lastModifiedTime = this.lastModified;
          if (lastModifiedFileId && currentFileId && localStorageLastModifiedTime && lastModifiedTime && lastModifiedFileId == currentFileId && localStorageLastModifiedTime > lastModifiedTime) {
            this.loadModel();
          }
        }
      }
    });

    this.route.paramMap
      .subscribe((params: ParamMap) => {
        this.modelId = params.get('id');
        this.loadModel();
      });

  }

}
