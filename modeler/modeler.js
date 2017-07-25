'use strict';

var fs = require('fs');
var jwtDecode = require('jwt-decode');
var Modeler = require('bpmn-js/lib/Modeler');

// Bootstrap modals did not work with the reqular var
var $ = window.$ = window.jQuery = require('jquery');
var bs = require('bootstrap');

var request = require('superagent');

var embeddedComments = require('bpmn-js-embedded-comments');

var SqlBPMNModdle = {
  name: 'Pleak PA-BPMN & PE-BPMN',
  prefix: 'pleak',
  uri: 'http://pleak.io/',
  xml: {
    tagAlias: "lowerCase"
  },
  associations: new Array(),
  types: [
    {
      name: "SQLTask",
      extends: [
        "bpmn:Task"
      ],
      properties: [
        {
          "name": "sqlScript",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "sensitivityMatrix",
          "isAttr": false,
          "type": "String"
        }
      ]
    },
    {
      name: "StereotypeTask",
      extends: [
        "bpmn:Task"
      ],
      properties: [
        {
          "name": "PKEncrypt",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "PKDecrypt",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "PKComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "MPC",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SKEncrypt",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SKDecrypt",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SKComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SSSharing",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SSComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "SSReconstruction",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "AddSSSharing",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "AddSSComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "AddSSReconstruction",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "FunSSSharing",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "FunSSComputation",
          "isAttr": false,
          "type": "String"
        },
        {
          "name": "FunSSReconstruction",
          "isAttr": false,
          "type": "String"
        },
      ]
    },
    {
      name: "SQLDataObjectReference",
      extends: [
        "bpmn:DataObjectReference"
      ],
      properties: [
        {
          "name": "sqlScript",
          "isAttr": false,
          "type": "String"
        }
      ]
    }
  ]
};

var _ = require('lodash');

var modeler = new Modeler({ container: '#canvas', keyboard: { bindTo: document },
  propertiesPanel: {
    parent: '#js-properties-panel'
  },
  additionalModules: [
    embeddedComments
  ],
  moddleExtensions: {
    sqlExt: SqlBPMNModdle
  }
});

var config = JSON.parse(fs.readFileSync(__dirname + '/../config.json', 'utf8'));

var domain = config.frontend.host;
var backend = config.backend.host;

var file = {};
var fileId = null;
var saveFailed = false;
var lastContent = '';

var getToken = function() {
  var token = localStorage.getItem('jwt');
  if (token !== null) token = token.replace(/['"]+/g, '');
  return token;
};

var getDecodedToken = function() {
  return jwtDecode(getToken());
};

var modelId = window.location.pathname.split('/')[2];

var fileName = $('#fileName');

var downloadButton = $('#download-diagram');
var downloadSvgButton = $('#download-svg');
var saveButton = $('#save-diagram');

function checkAuth() {
  request.get(backend + '/rest/auth')
    .set('JSON-Web-Token', getToken())
    .end(function(err, res) {
    if (err) {
      $('.buttons').hide();
      $('#login-container').show();
      $('#loginModal').modal();
    } else {
      getFile();
    }
  });
}

$('#loginForm').submit(function(event) {
  event.preventDefault();
});

$('#loginModal').on('hidden.bs.modal', function (e) {
  $('.credentials').show();
  $('#loginHelpCredentials').hide();
  $('#loginHelpServer').hide();
  $('.form-group').removeClass('has-error');
});

$('#loginModal').on('show.bs.modal', function (e) {
  $('#loginHelpCredentials').hide();
  $('#loginHelpServer').hide();
  $('.form-group').removeClass('has-error');
});

$('#loginButton').click(function() {
  $('#loginLoading').show();
  $('.credentials').hide();
  var user = {
    'email': $('#userEmail').val(),
    'password': $('#userPassword').val()
  };
  request.post(backend + '/rest/auth/login/')
    .send(user)
    .set('Accept', 'application/json')
    .end(function(err, res) {
      if (!err) {
        localStorage.setItem("jwt", '"' + res.body.token + '"');
        if ($.isEmptyObject(file)) getFile();
        $('#loginLoading').fadeOut("slow", function(){
          $('.buttons').show();
          $('#login-container').hide();
        });
        $('#loginModal').modal('hide');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
        if (saveFailed) save();
      } else {
        $('.buttons').hide();
        $('#login-container').show();
        $('#loginLoading').fadeOut("slow", function(){
          $('.credentials').show();
          $('.form-group').addClass('has-error');
          if (err.status === 403) {
            $('#loginHelpCredentials').show();
          } else {
            $('#loginHelpServer').show();
          }
        });
      }
  });
});


var getFile = function() {
  request.get(backend + '/rest/directories/files/' + modelId)
    .set('JSON-Web-Token', getToken())
    .end(function(err, res) {
      if (!err) {
        file = res.body;
        fileId = file.id;
        if (file.content.length === 0) {
          file.content = fs.readFileSync(__dirname + '/resources/newDiagram.bpmn', 'utf-8');
        }
        openDiagram(file.content);
        lastContent = file.content;
        fileName.val(file.title);
        document.title += ' - ' + file.title;
        exportArtifacts();
      }
  });
};

//
// Loading a new blank bpmn diagram by default.
//


function openDiagram(diagram) {
  modeler.importXML(diagram, function(err) {
    if (err) {
      console.error('something went wrong:', err);
    }

    var moddle = modeler.get('moddle');
    var canvas = modeler.get('canvas');
    var elementRegistry = modeler.get('elementRegistry');

    canvas.zoom('fit-viewport');
  });
}

//
// Saving the model.
//
saveButton.click( function(e) {
  save();
});

var save = function() {
  if (saveButton.is('.active')) {
    $('#fileNameError').hide();
    file.title = fileName.val();
    request
      .put(backend + '/rest/directories/files/' + fileId)
      .set('JSON-Web-Token', getToken())
      .send(file)
      .end(function(err, res){
        if (res.statusCode === 200 || res.statusCode === 201) {
          $('#fileSaveSuccess').show();
          $('#fileSaveSuccess').fadeOut(5000);
          disableSaveButton();
          var date = new Date();
          localStorage.setItem("lastModifiedFileId", '"' + res.body.id + '"');
          localStorage.setItem("lastModified", '"' + date.getTime() + '"');
          if (fileId !== res.body.id) window.location = domain + '/modeler/' + res.body.id;
          file.md5Hash = res.body.md5Hash;
          lastContent = file.content;
          fileId = res.body.id;
          saveFailed = false;
        } else if (res.statusCode === 400) {
          saveFailed = true;
          $('#fileNameError').show();
        } else if (res.statusCode === 401) {
          saveFailed = true;
          $('#loginModal').modal();
        } else if (res.statusCode === 409) {
          saveFailed = true;
          delete file.id;
          if (parseInt(getDecodedToken().sub) !== file.user.id) {
            delete file.directory.id;
            file.directory.title = 'root';
          }
          $('#fileContentError').show();
        }
      });
  }
};

// metakey is windows key/mac cmd key
$(window).bind('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch (String.fromCharCode(event.which).toLowerCase()) {
        case 's':
            event.preventDefault();
            save();
            break;
        }
    }
});

$(window).bind('beforeunload', function(event) {
  if (file.content != lastContent) {
    return 'Are you sure you want to close this tab? Unsaved progress will be lost.';
  }
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

function disableSaveButton() {
  saveButton.removeClass('active');
}

function activateSaveButton() {
  saveButton.addClass('active');
}

function setEncoded(linkButton, name, data) {
  var encodedData = encodeURIComponent(data);

  if (data) {
    file.content = data;

    linkButton.addClass('active').attr({
      'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
      'download': name
    });
  } else {
    linkButton.removeClass('active');
  }
}

var exportArtifacts = _.debounce(function() {
  file.title = fileName.val();
  saveSVG(function(err, svg) {
    setEncoded(downloadSvgButton, file.title.slice(0, -5) + '.svg', err ? null : svg);
  });

  saveDiagram(function(err, xml) {
    setEncoded(downloadButton, file.title, err ? null : xml);
  });
}, 500);

function modelOrTitleChanged() {
  exportArtifacts();
  activateSaveButton();
}

$(document).on('ready', function() {

  checkAuth();

  $('.buttons a').click(function(e) {
    if (!$(this).is('.active')) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  modeler.on('commandStack.changed', modelOrTitleChanged);

  fileName.on('input',function() {
	  modelOrTitleChanged();
  });

  $(document).mouseup(function(e) {
    var container = $('.comments-overlay');
    if (!container.is(e.target) && container.has(e.target).length === 0) {
      modeler.get('comments').collapseAll();
    }
  });

  $(document).keydown(function(e) {
    var container = $('.comments-overlay').find('textarea');
    if (container.is(e.target) && e.which === 13 && !e.shiftKey) {
      e.preventDefault();
      modelOrTitleChanged();
    }
  });

});

// expose bpmnjs to window for debugging purposes
window.bpmnjs = modeler;
