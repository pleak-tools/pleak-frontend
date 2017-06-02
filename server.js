var express = require("express");
var fs = require("fs");
var app = express();
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

app.set('port', config.frontend.port);
app.use('/modeler/:id', express.static(__dirname + '/../' + config.frontend.folder + '/dist/modeler'));
app.use('/app/', express.static(__dirname + '/../' + config.frontend.folder + '/app'));
app.use('/sql-privacy-editor/:id', express.static(__dirname + '/../' + config.sql_editor.folder + '/dist'));
app.use('/', express.static(__dirname + '/../' + config.frontend.folder + '/app'));
app.use(express.static(__dirname + '/../'));
app.listen(app.get('port'), function() {
  console.log("App is running at: http://localhost:" + app.get('port') + "/app/#/");
});