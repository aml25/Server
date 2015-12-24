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
