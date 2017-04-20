var express = require("express");
var fs = require("fs");
var app = express();
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

app.set('port', config.frontend.port);
app.use('/modeler/:id', express.static(__dirname + '/dist/modeler'));
app.use(express.static(__dirname));

app.listen(app.get('port'), function() {
  console.log("App is running at: http://localhost:" + app.get('port') + "/app/#/");
});
