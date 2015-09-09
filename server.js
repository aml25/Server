/*** ALL THE REQUIRES ***/
var fs = require('fs');
var http = require('http');
var express = require('express');
var app = module.exports.app = express();
var server = http.createServer(app); //the server, serving the files to clients
var bodyParser = require('body-parser');
var io = require('socket.io')(server);
var url = require("url");
var path = require('path');
var TuneFarm = require('TuneFarm.js');
var TuneFarm = new TuneFarm();
/*** ============================== ***/

var host;
var staticHost = "tune.farm";

//config for username and password
//var messages = JSON.parse(fs.readFileSync("wall.json"));

//set up headers for the server (not sure if this is really needed)
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

//extend Express for JSON
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//serve a folder called "public," which contains all the data to be served to clients
//app.use(express.static(__dirname + '/public'));

function setHostEnvironment(newHost){
	host = newHost == "localhost" ? staticHost : host;
}


app.get("/", function(req, res){
	//set the host environment when a user visits the website
	host = setHostEnvironment(req.headers.host);
	if(host == "tune.farm"){
		TuneFarm.visit(req,res);
	}
});


/*** FINALLY, START LISTENING ON THE SERVER ***/
server.listen(80,  function(){
    console.log(server.address());
});