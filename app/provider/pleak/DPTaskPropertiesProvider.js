'use strict';

var inherits = require('inherits');

var PropertiesActivator = require('bpmn-js-properties-panel/lib/PropertiesActivator');

var dptaskProps = require('./parts/DPTaskProps');

function createPleakTabGroups(element, elementRegistry) {
  var pleakGroup = {
    id: 'pleak',
    label: 'Pleak',
    entries: []
  };
  dptaskProps(pleakGroup, element);
  return [
    pleakGroup
  ];
}

function DPTaskPropertiesProvider(eventBus, bpmnFactory, elementRegistry) {
  PropertiesActivator.call(this, eventBus);

  this.getTabs = function(element) {
    var pleakTab = {
      id: 'pleak',
      label: 'Differential privacy values',
      groups: createPleakTabGroups(element, elementRegistry)
    };
    return [
      pleakTab
    ];
  };
}

inherits(DPTaskPropertiesProvider, PropertiesActivator);

module.exports = DPTaskPropertiesProvider;
