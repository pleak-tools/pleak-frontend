'use strict';

var fs = require('fs');
var PleakModeler = require('./pleaks-modeler');

var $ = require('jquery');
var request = require('superagent');

var propertiesPanelModule = require('bpmn-js-properties-panel'),
    propertiesProviderModule = require('./provider/pleak'),
    dpTaskModdleDescriptor = require('./descriptors/dptask'),
    dpAnalizer = require('./provider/pleak/DPAnalyzer');

var _ = require('lodash');

var modeler = new PleakModeler({ container: '#canvas', keyboard: { bindTo: document },
  propertiesPanel: {
    parent: '#js-properties-panel'
  },
  additionalModules: [
    propertiesPanelModule,
    propertiesProviderModule
  ],
  moddleExtensions: {
    dptask: dpTaskModdleDescriptor
  } });

var config = JSON.parse(fs.readFileSync(__dirname + '/../config.json', 'utf8'));

var domain = config.frontend.host;
var backend = config.backend.host;

var file = {};

var token = localStorage.getItem('ls.JSON-Web-Token').replace(/['"]+/g, '');

//
// If model name arrived - requesting the model from the server.
//
var parentEvent;
window.addEventListener('message', function(event) {
  parentEvent = event;
  var origin = event.origin || event.originalEvent.origin;

  if (origin !== domain)
    return;
  var id = event.data.id;
  if (event.data.type === 'edit') {
    request
      .get(backend + '/rest/files/' + id)
      .set('JSON-Web-Token', token)
      .end(function(err, res){
        file = res.body;
        openDiagram(file.content);
        $('#fileName').val(file.title);
      });
  } else if (event.data.type === 'view') {
    request
      .get(backend + '/rest/files' + file.id)
      .set('JSON-Web-Token', token)
      .end(function(err, res){
        file = res.body;
        openDiagram(file.content);
        $('#fileName').val(file.title);
        $('.djs-palette').hide();
        $('.buttons').hide();
      });
  } else {
    $('#fileName').val(event.data.title);
  }

}, false);

//
// Loading a new blank bpmn diagram by default.
//
var newDiagramXML = fs.readFileSync(__dirname + '/../resources/newDiagram.bpmn', 'utf-8');

openDiagram(newDiagramXML);

function openDiagram(diagram) {
  modeler.importXML(diagram, function(err) {
    if (err) {
      console.error('something went wrong:', err);
    }

    var moddle = modeler.get('moddle');
    var canvas = modeler.get('canvas');
    var elementRegistry = modeler.get('elementRegistry');

    canvas.zoom('fit-viewport');
    function getExtension(element, type) {
        if (!element.extensionElements) { return null; }
        return element.extensionElements.filter(function(e) {
            return e.$instanceOf(type);
        })[0];
    }

    $('#analyze-diagram').click(function(event) {
        dpAnalizer(elementRegistry);
        event.stopPropagation();
        event.preventDefault();
    });

    document.focusTracker = function(param) {
      console.log('got focus!!!');
      var ids = param.id.split(",");
      console.log(param.id);
      canvas.addMarker(ids[0], 'highlight');
      canvas.addMarker(ids[1], 'highlight');
    };

    document.blurTracker = function(param) {
      console.log('lost focus!!!');
      var ids = param.id.split(",");
      console.log(param.id);
      canvas.removeMarker(ids[0], 'highlight');
      canvas.removeMarker(ids[1], 'highlight');
    };

    document.changeTracker = function(param) {
        console.log('new value!!!');
        console.log(param.value);
        var ids = param.id.split(",");
        var element = elementRegistry.get(ids[2]);
        element.businessObject.matrices[ids[3]][ids[0]][ids[1]] = param.value;
    };

    document.toggleDPTaskTracker = function (elementId) {
        var element = elementRegistry.get(elementId);
        element.dptask = !element.dptask;
        if (element.dptask)
            canvas.addMarker(elementId, 'highlight-dptask');
        else
            canvas.removeMarker(elementId, 'highlight-dptask');
    };

    document.checkMatrices = function(element, preds, succs) {
        var matrices = {dpMatrix: {}, cMatrix: {}};
        for (var i in preds) {
            var src = preds[i];
            var row1 = {}, row2 = {};
            for (var j in succs) {
                var tgt = succs[j];
                var value1 = 1.0, value2 = 1.0;
                if (element.businessObject.matrices) {
                    var _dpMatrix = element.businessObject.matrices.dpMatrix,
                        _cMatrix = element.businessObject.matrices.cMatrix;
                    if (_dpMatrix[src.id] && _dpMatrix[src.id][tgt.id]) {
                        value1 = _dpMatrix[src.id][tgt.id];
                        value2 = _cMatrix[src.id][tgt.id];
                    }
                }
                row1[tgt.id] = value1;
                row2[tgt.id] = value2;
            }
            matrices.dpMatrix[src.id] = row1;
            matrices.cMatrix[src.id] = row2;
        }
        element.businessObject.matrices = matrices;


        // ==============================================
        // === Do not remove the following lines (they will be used when saving the BPMN file)

        var dptask_matrices = moddle.create('pleak:DPTaskDP');
        var dpMatrix = moddle.create('pleak:DPValues'),
            cMatrix = moddle.create('pleak:CValues');
        dpMatrix.text = JSON.stringify(matrices.dpMatrix);
        cMatrix.text = JSON.stringify(matrices.cMatrix);
        console.log(dptask_matrices);
        console.log(dpMatrix);
        dptask_matrices.set('dpvalues', dpMatrix);
        dptask_matrices.set('cvalues', cMatrix);

        element.businessObject.DPTaskDP = dptask_matrices;
        console.log(dptask_matrices);
        // ===============================================
    };
  });
}

//
// Saving the model.
//
var saveButton = $('#save-diagram');

saveButton.click( function(e) {
  $('#fileNameError').hide();
  file.title = $('#fileName').val();

  request
    .post(backend + '/rest/files')
    .set('JSON-Web-Token', token)
    .send(file)
    .end(function(err, res){
      console.log(res);
      if (res.statusCode === 200 || res.statusCode === 201) {
        $('#fileSaveSuccess').show();
        $('#fileSaveSuccess').fadeOut(5000);
        disableAllButtons();
        file.md5Hash = res.body.success;
      } else if (res.statusCode === 409) {
        $('#fileNameError').show();
      }
    });
  parentEvent.source.postMessage("received", parentEvent.origin);
});

//
// Downloading the model.
//
function saveSVG(done) {
  modeler.saveSVG(done);
}

function saveDiagram(done) {
  modeler.saveXML({ format: true }, function(err, xml) {
    done(err, xml);
  });
}

function disableAllButtons() {
  var downloadButton = $('#download-diagram');
  var downloadSvgButton = $('#download-svg');
  var saveButton = $('#save-diagram');
  downloadButton.removeClass('active');
  downloadSvgButton.removeClass('active');
  saveButton.removeClass('active');
  $('#analyze-diagram').removeClass('active');
}

$(document).on('ready', function() {
  var downloadButton = $('#download-diagram');
  var downloadSvgButton = $('#download-svg');
  var analyzeButton = $('#analyze-diagram');

  $('.buttons a').click(function(e) {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  function setEncoded(linkButton, name, data) {
    var encodedData = encodeURIComponent(data);

    if (data) {
      file.content = data;

      saveButton.addClass('active');
      linkButton.addClass('active').attr({
        'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
        'download': name
      });
      analyzeButton.addClass('active');
    } else {
      linkButton.removeClass('active');
      saveButton.removeClass('active');
      analyzeButton.removeClass('active');
    }
  }

  var exportArtifacts = _.debounce(function() {
    file.title = $('#fileName').val();
    saveSVG(function(err, svg) {
      setEncoded(downloadSvgButton, file.title.slice(0, -5) + '.svg', err ? null : svg);
    });

    saveDiagram(function(err, xml) {
      setEncoded(downloadButton, file.title, err ? null : xml);
    });
  }, 500);

  modeler.on('commandStack.changed', exportArtifacts);
});

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
