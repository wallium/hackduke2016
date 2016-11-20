var express = require('express');
var app = express();
require('es6-promise').polyfill();
var pg = require('pg');
var bodyParser = require('body-parser');
const util = require('util');

// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

pg.defaults.ssl = true;




app.get('/db', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query('SELECT * FROM test_table', function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('pages/db', {results: result.rows} ); }
    });
  });
});



var port_number = process.env.PORT || 8081;
var server = app.listen(port_number, function () {
  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)
  console.log(util.format("date is %s", new Date()));
})