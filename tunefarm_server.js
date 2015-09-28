/*** ALL THE REQUIRES ***/
var express = require('express');
var app = express();
var server = require("http").createServer(app);
var https = require("https");
var email = require("emailjs");


var bodyParser = require('body-parser');
var fs = require("fs");

var io = require("socket.io")(server);
var playMusic = require("playmusic");
playMusic = new playMusic();

//set up headers for the server (not sure if this is really needed)
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

//extend Express for JSON
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


//bring in all the TuneFarm files/folders
app.use(express.static(__dirname + '/public/TuneFarm'));
//bring in the JS folder to the server to be used by all HTML pages
app.use(express.static(__dirname + '/public/js'));
//bring in the JS folder to the server to be used by all HTML pages
app.use(express.static(__dirname + '/public/css'));

/////////////////////////////////////////////////////////////////////////////////////////////////

config = JSON.parse(fs.readFileSync("config.json"));
var rooms = {}; //this is a dummy for testing

var emailServer = email.server.connect({
	user: config.email.email,
	password: config.email.password,
	host: "mail.name.com",
	ssl: true
});

playMusic.init(config.playmusic, function(err, response){
	if(err) console.error(err);
	console.log("starting a google play music session");
});

app.get("/:id", function(req,res){
	res.sendFile(__dirname + "/public/TuneFarm/index.html");
});

app.get("/track/:mp3", function(req,res){
	var trackPath = __dirname + "/TuneFarmMusic/" + req.params.mp3;
	console.log(trackPath);
	res.sendFile(trackPath);
});

function getTrack(storeId, _callback){
	var _callback = _callback //create a local copy of the callback for later functions
	
	playMusic.getStreamUrl(storeId, function(err, res){
		var res = res; //create a local copy of the playMusic response for later functions

		var file = fs.createWriteStream(__dirname + "/TuneFarmMusic/" + storeId + ".mp3");
		var request = https.get(res, function(response) {
			response.pipe(file);

			_callback();
		});
	});
}

function lastIndex(array){
	return array[array.length-1];
}


/***HANDLE SOCKET COMMUNICATION*****************************************************************/
//self.initIO = function(){
	io.on("connection",function(socket){
		console.log("room: " + socket.rooms);
		
		//join a client to a room
		socket.on("joinRoom", function(room){
			var room = room.length > 1 ? room : "/" + lastIndex(socket.rooms);
			console.log(room);

			socket.join(room, function(){
				console.log("joining room: " + lastIndex(socket.rooms));

				var myRoom = {};

				if(!rooms.hasOwnProperty(lastIndex(socket.rooms))){
					console.log("setting room for the first time...");
					rooms[lastIndex(socket.rooms)] = {
						tracks: [],
						currentTrack: 0,
						currentTime: 0,
						isPlaying: false,
						roomDetails: {
							liveState: false,
							roomName: lastIndex(socket.rooms),
							numListeners: 0
						}
					};
				}

				rooms[lastIndex(socket.rooms)].roomDetails.numListeners++;
				//send back to the client
				socket.emit("joinRoomResults", rooms[lastIndex(socket.rooms)]);

				var num = rooms[lastIndex(socket.rooms)].roomDetails.numListeners;
				io.sockets.in(lastIndex(socket.rooms)).emit("numberOfListenersResults", num);
			});
		});

		//handle searching for something
		socket.on("search", function(data){
			console.log("got a search and I'm in room: " + lastIndex(socket.rooms));
			console.log("request: search");
			playMusic.search(data.query, 5, function(err, data){
				var data = data.entries.sort(function(a, b) { // sort by match score
					return a.score < b.score;
				});

				var artists = [];
				var albums = [];
				var tracks = [];

				for(var i=0;i<data.length;i++){
					switch(data[i].type){
						case '1': //track
							tracks.push(data[i].track);
							break;
						case '2': //artist
							artists.push(data[i].artist);
							break;
						case '3': //album
							albums.push(data[i].album);
							break;
					}
				}

				data = {
					artists: artists,
					albums: albums,
					tracks: tracks
				}

				io.sockets.in(lastIndex(socket.rooms)).emit("searchResults", data);

			})
		});

		//handle artist request
		socket.on("getArtist", function(data){
			console.log("request: get artist");
			playMusic.getArtist(data.artistId, true, 4, 0, function(err, data){
				var artists = [];
				var albums = [];
				var tracks = [];

				artists.push(data);
				albums = data.albums;
				tracks = data.topTracks;

				data = {
					artists: artists,
					albums: albums,
					tracks: tracks
				}
				
				io.sockets.in(lastIndex(socket.rooms)).emit("artistResults", data);
			});
		});

		//handle album request
		socket.on("getAlbum", function(data){
			console.log("request: get album");

			playMusic.getAlbum(data.albumId, true, function(err, data){
				var albums = [];
				var tracks = [];

				albums.push(data);
				tracks = data.tracks;

				data = {
					artists: null,
					albums: albums,
					tracks: tracks
				}

				io.sockets.in(lastIndex(socket.rooms)).emit("albumResults", data);
			})
		});

		socket.on("addTrackToPlaylist", function(data){
			console.log("request: add to playlist");

			var data = data; //create a local copy of the track data for later functions

			//get track
			getTrack(data.storeId, function(){
				console.log("adding song to: " + lastIndex(socket.rooms));
				rooms[lastIndex(socket.rooms)].tracks.push({ src: "/track/" + data.storeId + ".mp3", trackData: data});

				console.log(JSON.stringify(rooms, null, 4));
				
				io.sockets.in(lastIndex(socket.rooms)).emit("playlistResults", rooms[lastIndex(socket.rooms)]);

				//anytime a track is added to a playlist of a public broadcast, send results to all clients connected to the server to keep things in sync
				if(rooms[lastIndex(socket.rooms)].roomDetails.liveState == true){
					emitBroadcastsToClients(); 
				}
			});
		});

		socket.on("getPlaylist", function(){
			socket.emit("playlistResults", rooms[lastIndex(socket.rooms)]);
		});

		socket.on("playTrack", function(data){
			console.log("got play track: ");
			console.log(data);
			rooms[lastIndex(socket.rooms)].currentTrack = data.currTrackIndex;
			rooms[lastIndex(socket.rooms)].currentTime = data.currTrackTime;
			rooms[lastIndex(socket.rooms)].isPlaying = true;
			console.log(rooms[lastIndex(socket.rooms)]);
			io.sockets.in(lastIndex(socket.rooms)).emit("playTrackResults", rooms[lastIndex(socket.rooms)]);
		});

		socket.on("broadcastRoom", function(state){
			console.log("state change = " + state);
			rooms[lastIndex(socket.rooms)].roomDetails.liveState = state;

			emitBroadcastsToClients(); //broadcast to all clients
		});

		socket.on("getBroadcastRooms", function(){

			emitBroadcastsToClients(socket); //broadcast just to this client
		});

		//send a pause signal to all connected clients in this room
		socket.on("pauseTrack", function(){
			rooms[lastIndex(socket.rooms)].isPlaying = false;
			io.sockets.in(lastIndex(socket.rooms)).emit("pauseTrackResults", "");
		});

		socket.on("updateCurrentTime", function(data){
			rooms[lastIndex(socket.rooms)].currentTime = data;
		});

		socket.on("sendFeedback", function(data){
			emailServer.send({
				text:    data.body, 
				from:    data.email, 
				to:      "feedback@tune.farm",
				subject: "::feedback::"
			}, function(err, message) { console.log(err || message); });
		});

		socket.on("leaveRoom", function(){
			rooms[lastIndex(socket.rooms)].roomDetails.numListeners--;

			var num = rooms[lastIndex(socket.rooms)].roomDetails.numListeners;
			io.sockets.in(lastIndex(socket.rooms)).emit("numberOfListenersResults", num);
		});

		socket.on('disconnect', function() {
			console.log('Got disconnect!');
		});
	});
//}
/*****************************************************************HANDLE SOCKET COMMUNICATION***/

function emitBroadcastsToClients(socket){
	if(socket == undefined){
		io.sockets.emit("broadcastRoomResults", getLiveRooms());
	}
	else{
		socket.emit("broadcastRoomResults", getLiveRooms());
	}
}

function getLiveRooms(){
	var liveRooms = [];
	for(var key in rooms){
		console.log("checking for: " + key);
		if(rooms.hasOwnProperty(key)){
			console.log(key + " - state = " + rooms[key].roomDetails.liveState);
			if(rooms[key].roomDetails.liveState == true){
				liveRooms.push(rooms[key]);
			}
		}
	}
	console.log(liveRooms);
	return liveRooms;
}


/*** FINALLY, START LISTENING ON THE SERVER ***/
server.listen(80,  function(){
    console.log(server.address());
});