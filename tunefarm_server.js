/*** ALL THE REQUIRES ***/
var express = require('express');
var app = express();
var server = require("http").createServer(app);
var https = require("https");
var io = require("socket.io")(server);

var email = require("emailjs");
var bodyParser = require('body-parser');
var fs = require("fs");

var musicLibrary = require("musicLibrary.js"); //connect to google music
var pouch = require("pouch.js"); //initiate the database

//set up headers for the server (not sure if this is really needed)
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

//extend Express for JSON
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


/***BRING ALL THE FOLDERS FROM TUNEFARM IN AS LOCAL FILES*************/
app.use(express.static(__dirname + '/public/TuneFarm'));
//bring in the JS folder to the server to be used by all HTML pages
app.use(express.static(__dirname + '/public/js'));
//bring in the CSS folder to the server to be used by all HTML pages
app.use(express.static(__dirname + '/public/css'));
/*************BRING ALL THE FOLDERS FROM TUNEFARM IN AS LOCAL FILES***/


config = JSON.parse(fs.readFileSync("tunefarmconfig.json"));
musicLibrary.initLibrary(config); //start the Google Music server login/connection

var emailServer = email.server.connect({
	user: config.email.email,
	password: config.email.password,
	host: "mail.name.com",
	ssl: true
});


app.get("/:id", function(req,res){
	res.sendFile(__dirname + "/public/TuneFarm/index.html");
});

app.get("/track/:mp3", function(req,res){
	var trackPath = __dirname + "/TuneFarmMusic/" + req.params.mp3;
	console.log(trackPath);
	res.sendFile(trackPath);
});

//make an HTTP request to stream the remote URL to a local file created above
function storeTrack(storeId, url, _callback){
	var file = fs.createWriteStream(__dirname + "/TuneFarmMusic/" + storeId + ".mp3"); //create an empty file for the track

	var request = https.get(url, function(response) {
		response.pipe(file);
		_callback();
	});
}


/***HANDLE SOCKET COMMUNICATION*****************************************************************/
io.sockets.on("connection", function(socket){
	//handle joining a room
	socket.on("joinRoom", function(room){
		if(socket.room == undefined){
			//this is the first room a user is joining
			console.log("I've never been in a room before...");
		}
		else{
			console.log("I'm already in a room, so let's leave that one first");
			//check against the database and remove the room if it's empty
			pouch.checkRoomStatus(socket.room, function(status){
				console.log("room is alive? " + status);
			})
			socket.leave(socket.room);
		}

		socket.join(room);
		socket.room = room;

		console.log(socket.room);

		//pouch module
		pouch.joinRoom(socket.room, function(data){
			console.log("joining room");
			console.log(JSON.stringify(data, null, 4));
			//send to the client making the request
			socket.emit("joinRoomResults", data); //return the entire room "document" to the client
		});
	});

	//handle renaming a room
	socket.on("renameRoom", function(room){
		var oldRoom = socket.room;
		//check against the database and remove the old room it it's empty
		pouch.checkRoomStatus(socket.room, function(status){
			console.log("room is alive? " + status);
		})
		socket.leave(oldRoom);
		socket.join(room);
		socket.room = room;

		//pouch module
		pouch.renameRoom({oldRoom: oldRoom, room: socket.room}, function(data){
			console.log("renaming room");
			console.log(JSON.stringify(data, null, 4));
			//send to the client making the request
			socket.emit("joinRoomResults", data); //join the new room on the client-side - use the same socket message --- send the whole room "document" to the client
		});
	});

	//handle searching for something
	socket.on("search", function(query){
		musicLibrary.search(query, function(data){
			//send to the client making the request
			socket.emit("searchResults", data);
		});
	});

	//handle artist request
	socket.on("getArtist", function(query){			
		musicLibrary.getArtist(query, function(data){
			//send to the client making the request
			socket.emit("artistResults", data);
		});
	});

	//handle album request
	socket.on("getAlbum", function(query){
		musicLibrary.getAlbum(query, function(data){
			//send to the client making the request
			socket.emit("albumResults", data);
		});
	});

	//handle request to add a track to playlist
	socket.on("addTrackToPlaylist", function(data){
		var trackData = data; //save a local copy of the track data for later use

		var file = fs.createWriteStream(__dirname + "/TuneFarmMusic/" + trackData.storeId + ".mp3"); //create an empty file for the track		

		musicLibrary.getTrack(trackData.storeId, function(url){
			storeTrack(trackData.storeId, url, function(){
				//add the track to the room's database (document)
				pouch.addTrackToPlaylist(socket.room, trackData, "/track/" + trackData.storeId + ".mp3", function(data){
					//send room data to all clients in the room, including *this* client
					io.sockets.in(socket.room).emit("playlistResults", data);
				});
			});
		});
	});

	//handle a get playlist request
	socket.on("getPlaylist", function(){
		pouch.getPlaylist(socket.room, function(data){
			//send to client making the request
			socket.emit("playlistResults", data);
		});
	});

	//handle a play track request
	socket.on("playTrack", function(data){
		data.isPlaying = true;
		pouch.updateState(socket.room, data, function(data){
			//send room data to all the clients in the room
			io.sockets.in(socket.room).emit("playTrackResults", data);
		});
	});

	//handle a pause track request
	socket.on("pauseTrack", function(){
		pouch.updateState(socket.room, {isPlaying: false}, function(data){
			//send update to all clients in the room
			io.sockets.in(socket.room).emit("pauseTrackResults", "");
		});
	});

	socket.on("getBroadcastRooms", function(){
		pouch.returnLiveRooms(function(liveRooms){
			//send to ALL clients connected to the server since this is a global list for the public
			io.sockets.emit("broadcastRoomResults", liveRooms);
		});
	});

	socket.on("broadcastRoom", function(state){
		pouch.updateState(socket.room, {"public": state}, function(data){
			pouch.returnLiveRooms(function(liveRooms){
				//send to ALL clients connected to the server since this is a global list for the public
				io.sockets.emit("broadcastRoomResults", liveRooms);
			});
		});
	});
	
	//handle the time interval from clients for updating track time as a track is playing
	socket.on("updateCurrentTime", function(currTrackTime){
		pouch.updateState(socket.room, {currTrackTime: currTrackTime}, function(data){
			//do something?
		});
	});

	//send feedback results from client to given email.
	socket.on("sendFeedback", function(data){
		emailServer.send({
			text:    data.body, 
			from:    data.email, 
			to:      config.email.email,
			subject: "::feedback::"
		}, function(err, message) { console.log(err || message); });
	});

	//handle the disconnection of a client
	socket.on('disconnect', function() {
		console.log('Got disconnect!');

		pouch.checkRoomStatus(socket.room, function(status){
			console.log("room is alive? " + status);
		});
	});
});










// //self.initIO = function(){
// 	io.on("connection",function(socket){
// 		console.log("room: " + socket.rooms);
		
// 		//join a client to a room
// 		socket.on("joinRoom", function(room){
// 			var room = room;
// 			console.log(room);

// 			console.log("was a part of: " + lastIndex(socket.rooms));

// 			socket.join(room, function(){
// 				console.log("joining room: " + room);

// 				var myRoom = {};

// 				if(!rooms.hasOwnProperty(lastIndex(socket.rooms))){
// 					console.log("setting room for the first time...");
// 					rooms[room] = {
// 						tracks: [],
// 						currentTrack: 0,
// 						currentTime: 0,
// 						isPlaying: false,
// 						roomDetails: {
// 							liveState: false,
// 							roomName: room,
// 							numListeners: 0
// 						}
// 					};
// 				}

// 				rooms[lastIndex(socket.rooms)].roomDetails.numListeners++;
// 				//send back to the client
// 				socket.emit("joinRoomResults", rooms[lastIndex(socket.rooms)]);

// 				var num = rooms[lastIndex(socket.rooms)].roomDetails.numListeners;
// 				io.sockets.in(lastIndex(socket.rooms)).emit("numberOfListenersResults", num);

// 				console.log(JSON.stringify(rooms, null, 4));
// 			});
// 		});

// 		//handle searching for something
// 		socket.on("search", function(query){
// 			console.log("got a search and I'm in room: " + lastIndex(socket.rooms));

// 			musicLibrary.search(query, function(data){
// 				io.sockets.in(lastIndex(socket.rooms)).emit("searchResults", data);
// 			});
// 		});

// 		//handle artist request
// 		socket.on("getArtist", function(query){			
// 			musicLibrary.getArtist(query, function(data){
// 				io.sockets.in(lastIndex(socket.rooms)).emit("artistResults", data);
// 			});
// 		});

// 		//handle album request
// 		socket.on("getAlbum", function(query){
// 			musicLibrary.getAlbum(query, function(data){
// 				io.sockets.in(lastIndex(socket.rooms)).emit("albumResults", data);
// 			});
// 		});

// 		socket.on("addTrackToPlaylist", function(data){
// 			console.log("request: add to playlist");

// 			var data = data; //create a local copy of the track data for later functions

// 			//get track
// 			getTrack(data.storeId, function(){
// 				console.log("adding song to: " + lastIndex(socket.rooms));
// 				rooms[lastIndex(socket.rooms)].tracks.push({ src: "/track/" + data.storeId + ".mp3", trackData: data});

// 				console.log(JSON.stringify(rooms, null, 4));
				
// 				io.sockets.in(lastIndex(socket.rooms)).emit("playlistResults", rooms[lastIndex(socket.rooms)]);

// 				//anytime a track is added to a playlist of a public broadcast, send results to all clients connected to the server to keep things in sync
// 				if(rooms[lastIndex(socket.rooms)].roomDetails.liveState == true){
// 					emitBroadcastsToClients();
// 				}
// 			});
// 		});

// 		socket.on("getPlaylist", function(){
// 			socket.emit("playlistResults", rooms[lastIndex(socket.rooms)]);
// 		});

// 		socket.on("playTrack", function(data){
// 			console.log("got play track: ");
// 			console.log(data);
// 			rooms[lastIndex(socket.rooms)].currentTrack = data.currTrackIndex;
// 			rooms[lastIndex(socket.rooms)].currentTime = data.currTrackTime;
// 			rooms[lastIndex(socket.rooms)].isPlaying = true;
// 			console.log(rooms[lastIndex(socket.rooms)]);
// 			io.sockets.in(lastIndex(socket.rooms)).emit("playTrackResults", rooms[lastIndex(socket.rooms)]);
// 		});

// 		socket.on("broadcastRoom", function(state){
// 			console.log("state change = " + state);
// 			rooms[lastIndex(socket.rooms)].roomDetails.liveState = state;

// 			emitBroadcastsToClients(); //broadcast to all clients
// 		});

// 		socket.on("getBroadcastRooms", function(){

// 			emitBroadcastsToClients(socket); //broadcast just to this client
// 		});

// 		//send a pause signal to all connected clients in this room
// 		socket.on("pauseTrack", function(){
// 			rooms[lastIndex(socket.rooms)].isPlaying = false;
// 			io.sockets.in(lastIndex(socket.rooms)).emit("pauseTrackResults", "");
// 		});

// 		socket.on("updateCurrentTime", function(data){
// 			// console.log("updating currentTime");
// 			// console.log("for room: " + lastIndex(socket.rooms));
// 			// console.log("with currentTime: " + data);
// 			rooms[lastIndex(socket.rooms)].currentTime = data;
// 			// console.log("currentTime in JSON = " + rooms[lastIndex(socket.rooms)].currentTime);
// 		});

// 		socket.on("sendFeedback", function(data){
// 			emailServer.send({
// 				text:    data.body, 
// 				from:    data.email, 
// 				to:      "feedback@tune.farm",
// 				subject: "::feedback::"
// 			}, function(err, message) { console.log(err || message); });
// 		});

// 		socket.on("leaveRoom", function(){
// 			rooms[lastIndex(socket.rooms)].roomDetails.numListeners--;

// 			var num = rooms[lastIndex(socket.rooms)].roomDetails.numListeners;
// 			io.sockets.in(lastIndex(socket.rooms)).emit("numberOfListenersResults", num);
// 		});

// 		socket.on('disconnect', function() {
// 			console.log('Got disconnect!');
// 		});
// 	});
// //}
// /*****************************************************************HANDLE SOCKET COMMUNICATION***/

// function emitBroadcastsToClients(socket){
// 	if(socket == undefined){
// 		io.sockets.emit("broadcastRoomResults", getLiveRooms());
// 	}
// 	else{
// 		socket.emit("broadcastRoomResults", getLiveRooms());	
// 	}
// }

// function getLiveRooms(){
// 	var liveRooms = [];
// 	for(var key in rooms){
// 		console.log("checking for: " + key);
// 		if(rooms.hasOwnProperty(key)){
// 			console.log(key + " - state = " + rooms[key].roomDetails.liveState);
// 			if(rooms[key].roomDetails.liveState == true){
// 				liveRooms.push(rooms[key]);
// 			}
// 		}
// 	}
// 	console.log(liveRooms);
// 	return liveRooms;
// }


/*** FINALLY, START LISTENING ON THE SERVER ***/
server.listen(80,  function(){
    console.log(server.address());
});