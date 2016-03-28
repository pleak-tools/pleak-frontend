'use strict';

var PleakModeler = require('./pleaks-modeler');
var modeler = new PleakModeler({ container: '#canvas', keyboard: { bindTo: document } });

var $ = require('jquery');
var request = require('superagent');
var _ = require('lodash');

var domain = 'http://localhost:8000';
var backend = 'http://localhost:8080/pleak-backend-maven';

var file = {
  id: -1,
  userId: 1
};

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
      .get(backend + '/rest/file/' + id)
      .withCredentials()
      .end(function(err, res){
        file = res.body;
        openDiagram(file.content);
        $('#fileName').val(file.title);
      });
  } else if (event.data.type === 'view') {
    request
      .get(backend + '/rest/file' + file.id)
      .withCredentials()
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
var newDiagramXML = require('../resources/newDiagram.bpmn');
openDiagram(newDiagramXML);

function openDiagram(diagram) {
  modeler.importXML(diagram, function(err) {
    if (err) {
      console.error('something went wrong:', err);
    }

    modeler.get('canvas').zoom('fit-viewport');
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
    .post(backend + '/rest/file')
    .send(file)
    .end(function(err, res){
      console.log(res);
      if (res.statusCode === 200) {
        $('#fileSaveSuccess').show();
        $('#fileSaveSuccess').fadeOut(5000);
        disableAllButtons();
        file.md5Hash = resJson.text;
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
}

$(document).on('ready', function() {
  var downloadButton = $('#download-diagram');
  var downloadSvgButton = $('#download-svg');

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
    } else {
      linkButton.removeClass('active');
      saveButton.removeClass('active');
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
