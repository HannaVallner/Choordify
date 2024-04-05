const express = require('express'); 
const request = require('request');
const crypto = require('crypto');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const app = express(); 

var client_id = 'a52b1c6ae851463b8614c146866ecf5d';
var client_secret = '19aff404760f490db5e964da47134a3d';
var redirect_uri = 'http://localhost:3000/callback'; 
var basePath = "http://localhost:4200/home"

const generateRandomString = (length) => {
    return crypto
    .randomBytes(60)
    .toString('hex')
    .slice(0, length);
}

var stateKey = 'spotify_auth_state';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP
  message: 'Too many requests from this IP, please try again later.'
});


app.use(express.static(__dirname + '/client'))
   .use(cors())
   .use(cookieParser())
  . use(limiter);


app.get("/spotify/auth", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  var scope =
    "user-read-private user-read-email user-top-read playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

/* CALLBACK URL from Spotify verification */
// when verification is complete, render homepage
app.get("/callback/", function (req, res) {
    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;
  
    if (state === null || state !== storedState) {
      res.redirect(
        "/#" +
          querystring.stringify({
            error: "state_mismatch",
          })
      );
    } else {
      res.clearCookie(stateKey);
      var authOptions = {
        url: "https://accounts.spotify.com/api/token",
        form: {
          code: code,
          redirect_uri: redirect_uri,
          grant_type: "authorization_code",
        },
        headers: {
          Authorization:
            "Basic " +
            new Buffer(client_id + ":" + client_secret).toString("base64"),
        },
        json: true,
      };
  
      request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          var access_token = body.access_token,
            refresh_token = body.refresh_token;
  
          res.redirect(basePath + "/?authorized=true#" + access_token);
        } else {
          res.redirect(
            basePath +
              "/?" +
              querystring.stringify({
                error: "invalid_token#error",
              })
          );
        }
      });
    }
});


app.get('/refresh_token', function(req, res) {
    var refresh_token = req.query.refresh_token;
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: { 
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')) 
      },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
      json: true
    };
  
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
            refresh_token = body.refresh_token;
        res.send({
          'access_token': access_token,
          'refresh_token': refresh_token
        });
      }
    });
});

// Get playlists
app.get('/api/playlists/:token', (req, res) => {
  const token = req.params.token;
  const options = {
      url: 'https://api.spotify.com/v1/me/playlists?limit=50&offset=0',
      headers: {
          'Authorization': 'Bearer ' + token
      }
  };
  request.get(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
          res.send(body);
      } else {
          res.status(response.statusCode).send(error);
      }
  });
});

// Get playlist's tracks
app.get('/api/playlists/:playlistId/tracks', (req, res) => {
  const { playlistId } = req.params;
  const { token, offset } = req.query;
  const options = {
    url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=${offset || 0}`,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };
  request.get(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      res.send(body);
    } else {
      res.status(response.statusCode).send(error);
    }
  });
});

// Get tracks' features
app.get('/api/tracks/features', (req, res) => {
  const { token, trackIds } = req.query;
  const options = {
    url: `https://api.spotify.com/v1/audio-features?ids=${trackIds}`,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };
  request.get(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      res.send(body);
    } else {
      res.status(response.statusCode).send(error);
    }
  });
});

// Get a track's features
app.get('/api/audio-features/:trackId', (req, res) => {
  const { trackId } = req.params;
  const { token } = req.query;
  const options = {
    url: `https://api.spotify.com/v1/audio-features/${trackId}`,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };
  request.get(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      res.send(body);
    } else {
      res.status(response.statusCode).send(error);
    }
  });
});

app.listen(3000, () => { 
	console.log('Server listening on port 3000'); 
});
