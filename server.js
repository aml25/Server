/*** ALL THE REQUIRES ***/
var express = require('express');
var app = express();
var appServer = require("http").createServer(app);

var bodyParser = require('body-parser');

var TuneFarm = require('TuneFarm.js');
var GrossNinja = require('GrossNinja.js');

//hosts that I want to listen for
var hosts = {
				"gross.ninja": {
					server: function(){
						return new GrossNinja(appServer)
					},
					directory: "GrossNinja"
				},
				"tune.farm": {
					server: function(){
						return new TuneFarm(appServer)
					},
					directory: "TuneFarm"
				}
			};
/*** ============================== ***/

var host;
var server;
var staticHost = "tune.farm"; //this is a placeholder for local testing

//set up headers for the server (not sure if this is really needed)
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

//extend Express for JSON
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

//bring in the JS folder to the server to be used by all HTML pages
app.use(express.static(__dirname + '/public/js'));


app.use(function(req,res){
	//ignore if favicon
	if(req.url === '/favicon.ico') {
		res.writeHead(200, {'Content-Type': 'image/x-icon'} );
		res.end();
		//console.log('favicon requested');
		return;
	}

	//if(host == undefined){
		//set the host environment when a user visits the website
		host = setHostEnvironment(req.headers.host);
		//console.log(host);

		console.log("request for: " + req.url);

		try{
			server = hosts[host].server();
		}
		catch(err){
			server = hosts[staticHost].server();
		}
		server.init(req.url);
	//}

	try{
		server.handleRequest(req, res);		
	}
	catch(err){
		server.send("404");
	}
})

function setHostEnvironment(newHost){
	var host = newHost == "localhost" ? staticHost : newHost;
	console.log(host + ": " + new Date());
	return host;
}

/*** FINALLY, START LISTENING ON THE SERVER ***/
appServer.listen(80,  function(){
    console.log(appServer.address());
});