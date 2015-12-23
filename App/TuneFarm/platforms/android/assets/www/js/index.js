/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// (function(){
//     vex.defaultOptions.className = 'vex-theme-plain';
// })();

var socket;
var playlist;
var currTrackIndex; //keep track of which song from the playlist we are on
var media; //this is the media element to play tracks
var playUpdater;
var isPlaying;
var isBroadcasting;


function formSubmit(){
    console.log("submitting search");
    $("input").blur();
    socket.emit("search", { query: $("input").val() });
}

function setMediaPosition(){
    console.log(media);
    if(media == null){
        currentTime = 0;
    }
    else{
        media.getCurrentPosition(function(position){
            currentTime = position;
            console.log("just set the media position to: " + currentTime);
        });
    }
}

//this is the main play function!!!
function emitPlayTrack(currentTime){

    if(currentTime == undefined){
        setMediaPosition();
    }

    if(currTrackIndex < playlist.tracks.length){
        socket.emit("playTrack", {currTrackIndex: currTrackIndex, currTrackTime: currentTime}); //send signal to everyone to start playing          
    }
    else{
        console.log("reached the end of the playlist");
    }
}

//playlist.tracks[currTrackIndex].src//
function loadTrack(trackSource){

    if(media != null){
        media.release();
    }

    media = new Media("http://tune.farm" + trackSource,
        // success callback
        function () {
            console.log("playAudio():Audio Success");

            
        },
        // error callback
        function (err) {
            console.log("currentTime = " + currentTime);
            console.log("playAudio():Audio Error: " + err);
            console.log(JSON.stringify(err, null, 4));
        },
        //status callback
        function (status){
            console.log("printing the status");
            console.log(status);

            if(status == 2){
                clearInterval(playUpdater);
                playUpdater = setInterval(function(){
                    setMediaPosition();
                    console.log("in the timer, the currentTime = " + currentTime);
                    socket.emit("updateCurrentTime", currentTime);
                    $("#currentTime").text(displayCurrentTime);
                }, 1000);
            }

            if(status == 4){
                
                playNextTrack();
            }
        }
    );
}

function playTrack(currentTime){
    if(currentTime == undefined){
        currentTime = 0;
    }

    if(media == null){
        console.log("loading new media because it's null");
        loadTrack(playlist.tracks[currTrackIndex].src);
    }

    media.play();
    console.log("seeking to: " + currentTime);
    media.seekTo(currentTime * 1000);

    

    $("#playPause").children().attr("src", "img/pause.png");
    isPlaying = true;

    $("#currentTrack").text(playlist.tracks[currTrackIndex].trackData.artist + " - " + playlist.tracks[currTrackIndex].trackData.title);
    
}

function pauseTrack(){
    socket.emit("pauseTrack", "");
    clearInterval(playUpdater);

    $("#playPause").children().attr("src", "img/play.png");
    isPlaying = false;
}

function playNextTrack(){
    clearInterval(playUpdater);
    currTrackIndex = currTrackIndex == playlist.tracks.length - 1 ? 0 : currTrackIndex + 1;

    loadTrack(playlist.tracks[currTrackIndex].src);

    emitPlayTrack(0);
}

function playPreviousTrack(){
    clearInterval(playUpdater);
    currTrackIndex = currTrackIndex == 0 ? playlist.tracks.length - 1 : currTrackIndex - 1;

    loadTrack(playlist.tracks[currTrackIndex].src);

    emitPlayTrack(0);
}

function displayCurrentTime(){
    var date = new Date(null);
    setMediaPosition();
    date.setSeconds(currentTime); // specify value for SECONDS here
    var displayTime = date.toISOString().substr(14, 5);

    var date2 = new Date(null);
    date2.setSeconds(media.getDuration()); // specify value for SECONDS here
    displayTime += " / " + date2.toISOString().substr(14, 5);

    return displayTime;
}

//broadcast the currently private room
function broadcastRoom(state){
    socket.emit("broadcastRoom", state);
}

//the main function to draw the browse music results from server
function drawBrowseResults(data){
    window.scrollTo(0,0);
    $("#browse section").empty();

    if(data.artists != null){
        $("#artists").prev().show();
        for(var i=0;i<data.artists.length;i++){
            var $p = $("<p>"+data.artists[i].name+"</p>");
            $p.data(data.artists[i]);

            $p.click(function(){
                socket.emit("getArtist", $(this).data());
            })

            $("#artists").append($p);
        }
    }
    else{
        $("#artists").prev().hide();
    }

    for(var i=0;i<data.albums.length;i++){
        var $p = $("<p>"+data.albums[i].name+"</p>");
        $p.data(data.albums[i]);

        $p.click(function(){
            socket.emit("getAlbum", $(this).data());
        })

        $("#albums").append($p);
    }

    for(var i=0;i<data.tracks.length;i++){
        var $p = $("<p>"+data.tracks[i].title+"</p>");
        $p.data(data.tracks[i]);

        $p.click(function(){
            //socket.emit("playTrack", $(this).data());
            socket.emit("addTrackToPlaylist", $(this).data());
            $(this).html("<em>track added to your playlist</em>");
            $(this).unbind();
        })

        $("#tracks").append($p);
    }
}

function drawBroadcastsResults(data){
    $("#broadcasts #broadcastsList").empty();

    for(var i=0;i<data.length;i++){
        $broadcast = "<details> \
            <summary>"+data[i].roomDetails.roomName+"</summary>\
            </details>";

        $("#broadcasts #broadcastsList").append($broadcast);

        var roomName = data[i].roomDetails.roomName;

        $("#broadcasts #broadcastsList").last().click(function(){
            handleBroadcastResultClick(roomName);
        });

        for(var u=0;u<data[i].tracks.length;u++){
            var $p = "<p>"+data[i].tracks[u].trackData.artist+" - "+data[i].tracks[u].trackData.title+"</p>";
            $("#broadcasts #broadcastsList details").last().append($p);
        }
        
    }
}

function handleBroadcastResultClick(roomName){
    joinRoom(roomName);
}

function drawPlaylistResults(data){
    $("#playlist #myPlaylist").empty();
    playlist = data;
    //console.log(playlist);
    for(var u=0;u<data.tracks.length;u++){
        var $p = $("<p>"+data.tracks[u].trackData.artist+" - "+data.tracks[u].trackData.title+"</p>");
        $p.data({trackIndex: u});

        $p.click(function(){
            currTrackIndex = $(this).data().trackIndex;
            emitPlayTrack(0);
        })

        $("#playlist #myPlaylist").last().append($p);
    }
}

//the main room handler function
function joinRoom(roomId){
    socket.emit("joinRoom", roomId);

    window.onbeforeunload = function(){
        socket.emit("leaveRoom", "");
    }

    socket.emit("getPlaylist", ""); //just grab any existing playlist on the server (**for this broadcast, when it's implemented**)

    socket.emit("getBroadcastRooms", ""); //on page load, grab existing rooms
}




var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {

        playlist = [];
        currTrackIndex = 0; //keep track of which song from the playlist we are on

        media = null; //this is the media element to play tracks

        playUpdater;

        isPlaying = false;

        isBroadcasting = false;

        $("#playPause").click(function(){
            if(!isPlaying){
                emitPlayTrack(currentTime);
            }
            else{
                pauseTrack();
            }
        });

        $("#playPause").one("click", function(){
            if(!isBroadcasting){
                vex.dialog.confirm({
                    message: 'Do you want to turn your playlist into a radio station?',
                    buttons: [
                        $.extend({}, vex.dialog.buttons.YES, {
                            text: 'Sure'
                        }), $.extend({}, vex.dialog.buttons.NO, {
                            text: 'No'
                        })
                    ],
                    callback: function(value) {
                        if(value == true){
                            broadcastRoom(true);
                        }
                        else{
                            broadcastRoom(false);
                        }
                    }
                });
            }
        })

        $("#next").click(function(){
            playNextTrack();
        });

        $("#previous").click(function(){
            playPreviousTrack();
        });

        $("#feedback").click(function(){
            vex.dialog.open({
                message: "",
                input: "<input name='email' type='text' placeholder='Your email' required />\n<textarea rows='4' name='body' placeholder='Your message' required></textarea>",
                buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                    text: 'Send'
                }), $.extend({}, vex.dialog.buttons.NO, {
                    text: 'Nevermind'
                })
                ],
                callback: function(data) {
                    if (data === false) {
                        return console.log('Cancelled');
                    }
                    socket.emit("sendFeedback", data);
                }
            });
        });

        $("li").click(function(e){
            $("#"+$(this).attr("data-link")).delay(500).fadeIn(550);
            $("main").not("#"+$(this).attr("data-link")).fadeOut(500);
        });


        /***SOCKET FUNCTIONS*******************************/
        socket = io('http://tune.farm'); //initiate the socket

        //load the room//
        joinRoom((Math.random()*Math.random()*Math.random())/Math.random());
        /////////////////

        //handle the result of joining a room from the server.  basically - if the connection to the server was made at root level, push to the URL the unique room name to keep track of URLs and rooms for the servers purpose
        socket.on("joinRoomResults", function(data){
            history.pushState({}, null, data.roomDetails.roomName);
            isBroadcasting = data.roomDetails.liveState;
        })

        //handle search results from the server
        socket.on("searchResults", function(data){
            console.log(data);

            drawBrowseResults(data);
        });

        //handle artist results from the server
        socket.on("artistResults", function(data){
            console.log(data);

            drawBrowseResults(data);
        });

        //handle album results from the server
        socket.on("albumResults", function(data){
            console.log(data);

            drawBrowseResults(data);
        });

        //handle playlist results from server
        socket.on("playlistResults", function(data){
            playlist = data;
            console.log(playlist);

            drawPlaylistResults(playlist);

            currTrackIndex = data.currentTrack;

            if(data.isPlaying){
                playTrack(data.currentTime);
            }
        });

        //signal from server to start playing a track on the client... could have come from THIS client or from a another client that THIS client is connected to
        socket.on("playTrackResults", function(data){
            currTrackIndex = data.currentTrack;

            console.log("playing: " + playlist.tracks[currTrackIndex].trackData.artist + " - " + playlist.tracks[currTrackIndex].trackData.title);

            console.log("about to fire playTrack function with currentTime: " + data.currentTime);
            playTrack(data.currentTime);

            //make the current track in the playlist "playing"
            $($("#myPlaylist").children()[currTrackIndex]).addClass("playing");
            //make all other tracks "not playing"
            $($("#myPlaylist").children().not($("#myPlaylist").children()[currTrackIndex])).removeClass("playing");
        });

        //a room's state has changed, update available rooms to clients
        socket.on("broadcastRoomResults", function(data){
            drawBroadcastsResults(data);
        });

        //a client just said pause to the room, so we will pause (I need to figure out if this is the desired resulting experience)
        socket.on("pauseTrackResults", function(){
            media.pause();
        });

        socket.on("numberOfListenersResults", function(data){
            console.log(data);
        });

        /*******************************SOCKET FUNCTIONS***/

    }
};

app.initialize();