# Tune Farm codebase

You'll need to create a configuration file to get this running properly in the parent `Server/` folder called `config.json`.  It should look like this:

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


Documentation
---
MusicLibrary
---
`musicLibrary.js` is the handler for Google Music requests.  It is a middle layer between the server and the [playmusic library by jamon](https://github.com/jamon/playmusic).  There is no documentation of the data format of the JSONs returned by most Google Music calls.  But refer to this library for some of that.

It has the following functions
```
search(query, _callback)  //is an asychronous function so it cannot return anything directly.  Use the `_callback` parameter for this.
getArtist(query, _callback) //same goes for this with it being an asycnhronous request
```

Search
---
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
  - `query` should look like this

  ```
  {
    "kind": "sj#artist",
    "name": "Pink Floyd",
    "artistArtRef": "http://lh3.googleusercontent.com/nJdWW6_WT0G8OSc8vWBOdIAtai_DLuyGm4dqDcaV_LkmuNQd_XCl4AWZYPchzvp9FPQLYhwK",
    "artistId": "Axgzvbfqg22bldaiqzpf2up3uny", //<-THIS IS THE IMPORTANT ONE
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
  
  


