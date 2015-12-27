/*draw.js*/

function Draw(){
	
}

//the main function to draw the search music results from server
Draw.prototype.drawSearchResults = function(data){
	window.scrollTo(0,0);
	$("#search section").empty();

	if(data.artists != null){
		$("#artists").prev().show();
		for(var i=0;i<data.artists.length;i++){
			var $div = $("<div><img src='"+ data.artists[i].artistArtRef +"'><p>"+data.artists[i].name+"</p></div>");
			$div.data(data.artists[i]);

			$div.click(function(){
				socket.emit("getArtist", $(this).data());
			})

			if($div.children("img").attr("src") != "undefined"){
				$("#artists").append($div);
			}
		}
	}
	else{
		//$("#artists").prev().hide();
	}

	for(var i=0;i<data.albums.length;i++){
		var $div = $("<div><img src='"+ data.albums[i].albumArtRef +"'><p>"+data.albums[i].name+"</p><p>"+data.albums[i].artist+"</p></div>");
		$div.data(data.albums[i]);

		$div.click(function(){
			socket.emit("getAlbum", $(this).data());
		})

		$("#albums").append($div);
	}

	for(var i=0;i<data.tracks.length;i++){
		var $table = $('<table> \
			<tr> \
				<td id="albumArt" rowspan="2"></td> \
				<td id="trackTitle"></td> \
				<td id="buttons" rowspan="2"><div class="button" data-action="add"><img src="/img/addtrack-01.png"></div></td> \
			</tr> \
			<tr> \
				<td id="artistTitle"></td> \
			</tr> \
		</table>');

		$table.find("#albumArt").html("<img src='"+data.tracks[i].albumArtRef[0].url+"'>");
		$table.find("#trackTitle").html("<p>"+data.tracks[i].title+"</p>");
		$table.find("#artistTitle").html("<p>"+data.tracks[i].artist+"</p><p>"+msToTime(data.tracks[i].durationMillis)+"</p>");
		
		var $div = $("<div></div>");
		$div.html($table);
		//var $div = $("<div><img src='"+data.tracks[i].albumArtRef[0].url+"'><p>"+data.tracks[i].title+"</p><br><p>"+data.tracks[i].artist+"</p></div>");
		$div.data(data.tracks[i]);

		$table.find("[data-action='add']").click(function(){
			//socket.emit("playTrack", $(this).data());
			socket.emit("addTrackToPlaylist", $(this).parents("div").first().data());
			$(this).parents("div").first().addClass("playlist");

			toastr.success('Track added to your playlist', '', {positionClass: 'toast-bottom-center'});

			$(this).unbind();

			$(this).children("img").attr("src", "/img/removetrack-01.png");
		});

		$("#tracks").append($div);
	}
}

Draw.prototype.drawPlaylistResults = function(data){
	$("#playlist section").empty();
	playlist = data;

	for(var i=0;i<data.tracks.length;i++){
		var $table = $('<table> \
			<tr> \
				<td id="albumArt" rowspan="2"></td> \
				<td id="trackTitle"></td> \
				<td id="buttons" rowspan="2"><div class="button" data-action="remove"><img src="/img/removetrack-01.png"></div></td> \
			</tr> \
			<tr> \
				<td id="artistTitle"></td> \
			</tr> \
		</table>');

		$table.find("#albumArt").html("<img src='"+data.tracks[i].trackData.albumArtRef[0].url+"'>");
		$table.find("#trackTitle").html("<p>"+data.tracks[i].trackData.title+"</p>");
		$table.find("#artistTitle").html("<p>"+data.tracks[i].trackData.artist+"</p><p>"+msToTime(data.tracks[i].trackData.durationMillis)+"</p>");

		var $div = $("<div></div>");
		$div.html($table);

		$div.data({trackIndex: i, id: data.tracks[i].trackData.storeId});

		$div.click(function(){
			currTrackIndex = $(this).data().trackIndex;

			//ion.sound.play($(this).data().id);
			emitPlayTrack(0);
		});

		$table.find("[data-action='remove']").click(function(){
			//socket emit removeTrackFromPlaylist...

			toastr.warning('Track removed from your playlist', '', {positionClass: 'toast-bottom-center'});

			$(this).parents("div").first().remove();
		});

		$("#playlist section").append($div);
	}
}

Draw.prototype.drawBroadcastsResults = function(data){
	$("#broadcasts section").empty();

	for(var i=0;i<data.length;i++){
		// $broadcast = "<details> \
		// 	<summary><a href='"+data[i].room+"'>"+data[i].room+"</a></summary>\
		// 	</details>";

		// $("#broadcasts section").append($broadcast);

		// for(var u=0;u<data[i].tracks.length;u++){
		// 	var $p = "<p>"+data[i].tracks[u].trackData.artist+" - "+data[i].tracks[u].trackData.title+"</p>";
		// 	$("#broadcasts section details").last().append($p);
		// }

		var $div = $("<div></div>");

		for(var u=0;u<data[i].tracks.length;u++){
			var $img = "<div class='broadcastImageContainer'><img src='"+data[i].tracks[u].trackData.albumArtRef[0].url+"'></div>";
			$div.append($img);
		}

		$div.append("<p>"+data[i].room+"</p>");

		$("#broadcasts section").append($div);
	}
}





