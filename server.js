var express = require('express');
var app = express();
require('es6-promise').polyfill();
var pg = require('pg');
var bodyParser = require('body-parser');
var db = 'postgres://oitsafamboapki:x6BEcGOw2_kJwR8nvqT6L_vDy2@ec2-54-243-45-168.compute-1.amazonaws.com:5432/d1kpljjduptkj8';
var cors = require('cors');
app.use(cors({credentials: true, origin: true}));
const util = require('util');

// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

pg.defaults.ssl = true;


// POST requests *************************************

// Updates the amount a organization has provided when a volunteer verifies
app.post('/verification', urlencodedParser, function (req, res) {
  req.body = JSON.parse(Object.keys(req.body)[0]);
  pg.connect(db, function(err, client) {
    if (err) {
      console.log("Ran into error");
      throw err;
    } 
    // console.log(req.body);
    var query = util.format("UPDATE Services SET Provided=%d WHERE County='%s' AND Org='%s' AND Resource='%s';",
      req.body.quantity, req.body.county, req.body.organizationName, req.body.resourceType); 
    // console.log(query);
    client.query(query);
  });
})

// Adds a new organization
app.post('/organizations', urlencodedParser, function (req, res) {
  req.body = JSON.parse(Object.keys(req.body)[0]);
  pg.connect(db, function(err, client) {
    if (err) {
      console.log("Ran into error");
      throw err;
    } 
    // console.log(req.body);
    var query = util.format("INSERT INTO Organizations (Org_name, Address) VALUES ('%s', '%s');",
      req.body.organizationName, req.body.organizationAddress); 
    // console.log(query);
    client.query(query);
  });
})

// Adds a new county/resource that an organization wants to service
app.post('/services', urlencodedParser, function (req, res) {
  req.body = JSON.parse(Object.keys(req.body)[0]);
  pg.connect(db, function(err, client) {
    if (err) {
      console.log("Ran into error");
      throw err;
    } 
    // console.log(req.body);
    var query = util.format("INSERT INTO Services (County, Org, Resource, Provided, Received) VALUES ('%s', '%s', '%s', %d, %d);",
      req.body.county, req.body.organizationName, req.body.resourceType, 0, 0); 
    // console.log(query);
    client.query(query);
  });
})

// Updates the resources received by an organization when a user donates
app.post('/donation', urlencodedParser, function (req, res) {
  req.body = JSON.parse(Object.keys(req.body)[0]);
  pg.connect(db, function(err, client) {
    if (err) {
      console.log("Ran into error");
      throw err;
    } 
    // console.log(req.body);
    var query = util.format("UPDATE Services SET Received=%d WHERE County='%s' AND Org='%s' AND Resource='%s';",
      req.body.newResourceValue, req.body.county, req.body.organization, req.body.resourceType); 
    // console.log(query);
    client.query(query);
  });
})

// GET requests *************************************

// Returns an array of each organization's contribution in a specific county
app.get('/county_contributions', function(req, res) {
  var response = [];
  var services = [];
  pg.connect(db, function(err, client) {
    if (err) {
      console.log("Ran into error");
      throw err;
    } 
    var query = util.format("SELECT Organizations.Org_name AS orgName, Organizations.Address AS orgAddress, Services.Resource AS resourceType, Services.Provided AS distributed, Services.Received AS received \
                                FROM Organizations INNER JOIN Services ON Organizations.Org_name = Services.Org WHERE Services.County=%s",
      req.query.county); 
    client.query(query).on('row', function(row){
      services.push(row);
      // console.log(JSON.stringify(row));
    }).on("end", function() {
      res.end(JSON.stringify(servicesToContributions(services)));
    });
  });
})

// Takes in a list of services provided to a county and consolidates it by organization
function servicesToContributions(services) {
  // unique organizations
  var orgs = [];
  for (service in services) {
    if (orgs.indexOf(service.orgName) < 0) {
      orgs.push(service.orgName);
    }
  }

  var contributions = [];
  for (org in orgs) {
    var contribution = new Object();
    contribution.orgName = org;
    contribution.receivedWater = -1;
    contribution.distributedWater = -1;
    contribution.receivedFood = -1;
    contribution.distributedFood = -1;
    contribution.receivedClothing = -1;
    contribution.distributionClothing = -1;
    for (service in services) {
      if (service.orgName == org) {
        contribution.orgAddress = service.orgAddress;
        switch(service.resourceType) {
          case 'water':
            contribution.receivedWater = service.received;
            contribution.distributedWater = service.distributed;
            break;
          case 'food':
            contribution.receivedFood = service.received;
            contribution.distributedFood = service.distributed;
            break;
          case 'clothing':
            contribution.receivedClothing = service.received;
            contribution.distributedClothing = service.distributed;
            break;
          default:
            console.log("Invalid resource type");
        }
      }
    }
    contributions.push(contribution);
  }
  return contributions;
}

// Returns total resources needed and received for all counties in a disaster
app.get('/disaster', function(req, res) {
  var response = {
    receivedFood: 0,
    neededFood: 0,
    receivedWater: 0,
    neededWater: 0,
    receivedClothing: 0,
    neededClothing: 0
  };

  pg.connect(db, function(err, client) {
    if (err) {
      console.log("Ran into error");
      throw err;
    } 
    var query = util.format("SELECT Water_needs, Food_needs, Clothing_needs \
                                FROM Counties WHERE Crisis='%s'",
      req.query.disaster); 
    client.query(query).on('row', function(row){
      console.log(row);
      response.neededFood = response.neededFood + row.Food_needs;
      response.neededWater = response.neededWater + row.Water_needs;
      response.neededClothing = response.neededClothing + row.Clothing_needs;
      console.log(response);
    }).on("end", function() {
      pg.connect(db, function(err, client) {
        if (err) {
          console.log("Ran into error");
          throw err;
        } 
        var query = util.format("SELECT Services.Resource AS resourceType, Services.Provided AS distributed \
                                    FROM Counties INNER JOIN Services ON Counties.County_name = Services.County WHERE Counties.Crisis='%s'",
          req.query.disaster); 
        client.query(query).on('row', function(row){
          // console.log(JSON.stringify(row));
          switch(row.resourceType) {
            case 'water':
              response.receivedWater = response.receivedWater + row.distributed;
              break;
            case 'food':
              response.receivedFood = response.receivedFood + row.distributed;
              break;
            case 'clothing':
              response.receivedClothing = response.receivedClothing + row.distributed;
              break;
            default:
              console.log("Invalid resource type");
          }
        }).on("end", function() {
          res.end(JSON.stringify(response));
        });
      });
    });
  });
})

// Returns total resources needed and received by a county
app.get('/county_needs', function(req, res) {
  var response = {
    receivedFood: 0,
    neededFood: 0,
    receivedWater: 0,
    neededWater: 0,
    receivedClothing: 0,
    neededClothing: 0
  };

  pg.connect(db, function(err, client) {
    if (err) {
      console.log("Ran into error");
      throw err;
    } 
    var query = util.format("SELECT Water_needs, Food_needs, Clothing_needs \
                                FROM Counties WHERE County_name='%s'",
      req.query.county); 
    client.query(query).on('row', function(row){
      response.neededFood = response.neededFood + row.Food_needs;
      response.neededWater = response.neededWater + row.Water_needs;
      response.neededClothing = response.neededClothin + row.Clothing_needs;
    }).on("end", function() {
      pg.connect(db, function(err, client) {
        if (err) {
          console.log("Ran into error");
          throw err;
        } 
        var query = util.format("SELECT Resource AS resourceType, Provided AS distributed \
                                    FROM Services WHERE County='%s'",
          req.query.disaster); 
        client.query(query).on('row', function(row){
          // console.log(JSON.stringify(row));
          switch(row.resourceType) {
            case 'water':
              response.receivedWater = response.receivedWater + row.distributed;
              break;
            case 'food':
              response.receivedFood = response.receivedFood + row.distributed;
              break;
            case 'clothing':
              response.receivedClothing = response.receivedClothing + row.distributed;
              break;
            default:
              console.log("Invalid resource type");
          }
        }).on("end", function() {
          res.end(JSON.stringify(response));
        });
      });
    });
  });
})

// Returns the quantity of a resource that an organization has given to a county
app.get('/org_single_contribution', function(req, res) {
  var response = {receivedResource: 0};
  pg.connect(db, function(err, client) {
    if (err) {
      console.log("Ran into error");
      throw err;
    } 
    var query = util.format("SELECT Received \
                                FROM Services WHERE Org='%s' AND County='%s' AND Resource='%s'",
      req.query.organization, req.query.county, req.query.resource); 
    client.query(query).on('row', function(row){
      response.receivedResource = response.receivedResource + row.Received;
    }).on("end", function() {
      res.end(JSON.stringify(response));
    });
  });
})


app.get('/', function (req, res) {
  res.send('Hello World');
})





var port_number = process.env.PORT || 8081;
var server = app.listen(port_number, function () {
  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)
  console.log(util.format("date is %s", new Date()));
})