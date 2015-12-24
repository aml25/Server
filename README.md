# Tune Farm codebase

*Disclaimer
- This is purely for experimentation.  Any stream grabbed from the `playmusic` library is strictly for testing purposes only and should never be stored.  This repo will drop Google Music as a source either upon request, or until ready for user testing.

You need an "All Access" account with Google Music for this repo to function.  Also, you'll need to create a configuration file to get this running properly in the parent `Server/` folder called `config.json`.  The format of this file is below in the `Init Library` function description.


Documentation
---
MusicLibrary
---
`musicLibrary.js` is the handler for Google Music requests.  It is a middle layer between the server and the [playmusic library by jamon](https://github.com/jamon/playmusic).  There is no documentation of the data format of the JSONs returned by most Google Music calls.  But refer to this library for some of that.

It has the following functions
```
var musicLibrary = require("musicLibrary.js");

initLibrary(config)  //start the Google Play service authentication.
search(query, _callback)  //is an asychronous function so it cannot return anything directly.  Use the `_callback` parameter for this.
getArtist(query, _callback)  //same goes for this with it being an asycnhronous request.
getAlbum(query, _callback)  //same goes here, use _callbak for a data return.
getTrack(storeId, _callback)  //only looking for the "storeId" here, which is just a String
```

Init Library
---

The function to start everything and authenticate an account with Google Play.  Please refer to [playmusic library by jamon](https://github.com/jamon/playmusic) for more info if needed.  It does not return anything.

- `config.json` should be formatted like this

	```
	{
		"playmusic": { /*this is your Google Music account*/
			"email": "some@email.com",
			"password": "somepassword"
		},
		"email": { /*this email is for the built in feedback mailer function - your customer service...*/
			"email": "someother@email.com",
			"password": "somepassword"
		}
	}
	```

Search
---

A generic function for searching the music library - artist/album/track/playlist title are good queries here.

- `query` should look like this

	```	
	{
		"query": "pink floyd"
	}
	```

- data to pass to your callback will look like this

	```	
	{
		"artists": [],
		"albums": [],
		"tracks": []
	}
	```
  
Get Artist
---

Use this to find a particular artist (their track and albums).  You'll need to know the `artistId` as returned by the generic `Search` function.

- `query` should look like this

	```	
	{
		"kind": "sj#artist",
		"name": "Pink Floyd",
		"artistArtRef": "http://lh3.googleusercontent.com/nJdWW6_WT0G8OSc8vWBOdIAtai_DLuyGm4dqDcaV_LkmuNQd_XCl4AWZYPchzvp9FPQLYhwK",
		"artistId": "Axgzvbfqg22bldaiqzpf2up3uny", //<-- THIS IS THE IMPORTANT ONE
		"artist_bio_attribution": {
			"kind": "sj#attribution",
			"source_title": "Wikipedia",
			"source_url": "http://en.wikipedia.org/wiki/Pink_Floyd",
			"license_title": "Creative Commons Attribution CC-BY-SA 4.0",
			"license_url": "http://creativecommons.org/licenses/by-sa/4.0/legalcode"
		}
	}
	```
 
- data to pass to your callback will look like this
	
	```
	{
		"artists": [],
		"albums": [],
		"tracks": []
	}
	```

Get Album
---
Use this to get the tracks and details of a particular album.  You'll need to know the `albumId` to discover this, as returned by the `Search` function or `Get Artist`.

- `query` should look like this

	```
	{
		"kind": "sj#album",
		"name": "The Dark Side Of The Moon",
		"albumArtist": "Pink Floyd",
		"albumArtRef": "http://lh6.ggpht.com/MnVhY1-anquCtTZ4viM4zwxHV6igUfsvZZRBL11y7IRuErsolqgV1GKjbPO-1YVx0ogM3ujNZg",
		"albumId": "Bdk5ab2rzncjc72ovwrb3e2kcpm", //<-- THIS IS THE IMPORTANT ONE
		"artist": "Pink Floyd",
		"artistId": [
			"Axgzvbfqg22bldaiqzpf2up3uny"
		],
		"description_attribution": {
			"kind": "sj#attribution",
			"source_title": "Wikipedia",
			"source_url": "http://en.wikipedia.org/wiki/The_Dark_Side_of_the_Moon",
			"license_title": "Creative Commons Attribution CC-BY-SA 4.0",
			"license_url": "http://creativecommons.org/licenses/by-sa/4.0/legalcode"
		},
		"year": 1973
	}
	```

Get Track
---
This is the main function to get the actual audio file, you'll need to know the `storeId` for this particular track.  Any of the above functions will return a `storeId` for tracks in the results.

- `storeId` is grabbed from a JSON object like this

	```
	{
		"kind": "sj#track",
		"title": "The Great Gig In The Sky (2011 Remastered Version)",
		"artist": "Pink Floyd",
		"composer": "",
		"album": "The Dark Side Of The Moon",
		"albumArtist": "Pink Floyd",
		"year": 2011,
		"trackNumber": 5,
		"genre": "Classic Rock",
		"durationMillis": "283000",
		"albumArtRef": [
			{
				"url": "http://lh6.ggpht.com/MnVhY1-anquCtTZ4viM4zwxHV6igUfsvZZRBL11y7IRuErsolqgV1GKjbPO-1YVx0ogM3ujNZg"
			}
		],
		"discNumber": 1,
		"estimatedSize": "11357023",
		"trackType": "7",
		"storeId": "Tkibqecqijqtu3z5wi5rji6l2ya",
		"albumId": "Bdk5ab2rzncjc72ovwrb3e2kcpm",
		"artistId": [
			"Axgzvbfqg22bldaiqzpf2up3uny"
		],
		"nid": "Tkibqecqijqtu3z5wi5rji6l2ya",
		"trackAvailableForSubscription": true,
		"trackAvailableForPurchase": true,
		"albumAvailableForPurchase": false,
		"contentType": "2"
	}
	```


