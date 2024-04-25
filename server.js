const express = require('express'); 
const request = require('request');
const crypto = require('crypto');
const cors = require('cors');
const session = require('express-session');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const app = express(); 

var client_id = 'a52b1c6ae851463b8614c146866ecf5d';
var client_secret = '19aff404760f490db5e964da47134a3d';
var redirect_uri = 'http://localhost:3000/callback'; 
var basePath = 'http://localhost:4200/home';
var stateKey = 'spotify_auth_state';


const generateRandomString = (length) => {
    return crypto
    .randomBytes(60)
    .toString('hex')
    .slice(0, length);
}



/*              MIDDLEWARE SETUP             */

app.use(cors({
  origin: ['http://localhost:4200'], 
  credentials: true,
 }));

 app.use(session({
  secret: 'muumitroll',
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(__dirname + '/client'));
app.use(cookieParser());
app.use(express.json());



/*                    API CALL FUNCTIONS                    */


app.get("/spotify/auth", function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  var scope =
    "user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private";
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
app.get("/callback/", function(req, res) {
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
            new Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
        json: true,
      };
  
      request.post(authOptions, function(error, response, body) {
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

// Get playlists with average features
app.get('/api/playlists/:token', function(req, res) {
  if (req.session.playlists) {
    res.send(req.session.playlists);
  } else {
    const token = req.params.token;
      // Get all playlists with an API call
    const options = {
      url: 'https://api.spotify.com/v1/me/playlists?limit=50&offset=0',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    };
    request.get(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        let unfiltered_playlists = JSON.parse(body).items;

        // Initialize an array to store promises for fetching track features
        const trackFeaturePromises = [];

        // Filter out playlists curated by Spotify, as they can't be modified
        const playlists = unfiltered_playlists.filter((playlist) => {
          return playlist.owner.display_name !== "Spotify";
        });

        // Fetch all tracks' for each playlist
        playlists.forEach((playlist) => {
          const playlistId = playlist.id;
          let offset = 0;
          const tracksOptions = {
            url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=${offset}`,
            headers: {
              'Authorization': 'Bearer ' + token
            }
          };
          trackFeaturePromises.push(new Promise((resolve, reject) => {
            request.get(tracksOptions, (error, response, body) => {
              if (!error && response.statusCode === 200) {
                const trackItems = JSON.parse(body).items;
                // Attach tracks to playlist
                playlist.songs = trackItems;
                // Extract track IDs
                const trackIds = trackItems.map((item) => item.track.id).join(',');
                // Fetch track features for all tracks
                const featuresOptions = {
                  url: `https://api.spotify.com/v1/audio-features?ids=${trackIds}`,
                  headers: {
                    'Authorization': 'Bearer ' + token
                  }
                };
                request.get(featuresOptions, (error, response, body) => {
                  if (!error && response.statusCode === 200) {
                    const trackFeatures = JSON.parse(body).audio_features;
                    playlist.songs.forEach((song, index) => {
                      song.features = trackFeatures[index]; // Attach features to each track
                    });
                    resolve(trackFeatures);
                  } else {
                    reject(error);
                  }
                });
              } else {
                reject(error);
              }
            });
          }));
        });

        // Wait for all track features to be fetched
        Promise.all(trackFeaturePromises)
          .then((playlistTracksFeatures) => {
            // Calculate average features for each playlist
              const playlistsWithAverages = playlists.map((playlist, index) => {
              const trackFeatures = playlistTracksFeatures[index];
              const averageFeatures = calculatePlaylistAverages(trackFeatures);
              const normalizedAverages = normalizeFeatures(averageFeatures);
              playlist.features = normalizedAverages;
              return playlist;
            });

            // Save playlists with average features in the session
            req.session.playlists = playlistsWithAverages;
            req.session.save();
            res.send(playlistsWithAverages);
          })
          .catch((error) => {
            console.error("Error fetching track features:", error);
            res.status(500).send(error);
          });
      } else {
        res.status(response.statusCode).send(error);
      }
    });
  }
});


// Search for tracks
app.get('/api/search/tracks', function(req, res) {
  const { token, query } = req.query;
  const options = {
    url: `https://api.spotify.com/v1/search?q=${query}&type=track`,
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


// Return previously stored playlists
app.get('/api/stored_playlists', function(req, res){
  if (req.session.playlists) {
    res.send(req.session.playlists);
  } else {
    res.status(404).send("No playlists found");
  }
})

// Store chosen playlist
app.post('/api/store_playlist', function(req, res) {
  const playlist = req.body; 
  if (playlist) {
    req.session.playlist = playlist; 
    req.session.save(); 
    res.status(200).send("Playlist stored successfully");
  } else {
    res.status(400).send("No playlist data provided");
  }
});

// Return previously stored playlist
app.get('/api/stored_playlist', function(req, res){
  if (req.session.playlist) {
    res.send(req.session.playlist);
  } else {
    res.status(404).send("No playlist found");
  }
});

// Return previously stored playlists, with compatibility measures and appropriate sorting
app.get('/api/comp_playlists', function(req, res){
  if (req.session.comp_playlists) {
    res.send(req.session.comp_playlists);
  } else {
    res.status(404).send("No playlists found");
  }
})

// Return previously stored track
app.get('/api/stored_track', function(req, res) {
  if (req.session.track) {
    res.send(req.session.track);
  } else {
    res.status(404).send("No track found");
  }
});

// Get chosen track with filtered and normalized features
app.get('/api/tracks/:trackId', function(req, res) {
  const { trackId } = req.params;
  const { token } = req.query;
  const trackOptions = {
    url: `https://api.spotify.com/v1/tracks/${trackId}`,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };
  // First, get the track information
  request.get(trackOptions, (error, trackResponse, trackBody) => {
    if (!error && trackResponse.statusCode === 200) {
      let track = JSON.parse(trackBody);

      // Next, get the track features
      const featuresOptions = {
        url: `https://api.spotify.com/v1/audio-features/${trackId}`,
        headers: {
          'Authorization': 'Bearer ' + token
        }
      };
      request.get(featuresOptions, (featuresError, featuresResponse, featuresBody) => {
        if (!featuresError && featuresResponse.statusCode === 200) {
          let features = JSON.parse(featuresBody);

          // Normalize features and remove unnecessary ones
          const normalizedFeatures = normalizeFeatures(features);
          
          // Attach the normalized features to the track object
          track.features = normalizedFeatures;

          // Calculate compatibility of each playlist with the track features
          let playlists = req.session.playlists.slice();
          playlists.forEach((playlist) => {
            const compatibility = calculateCompatibility(normalizedFeatures, playlist.features);
            playlist.compatibility = compatibility;
          });

          // Order playlists based on compatibility
          playlists.sort((a, b) => {
            // If either of the playlist has no songs, move it to the end of the list
            if (!a.tracks || a.tracks['total'] === 0) return 1;
            if (!b.tracks || b.tracks['total'] === 0) return -1; 
            // Otherwise, sort based on compatibility
            return b.compatibility - a.compatibility;
          });

          // Store playlists and track in session management
          req.session.comp_playlists = playlists;
          req.session.track = track;
          req.session.save();

          res.send(track);
        } else {
          console.error("Error getting track features:", featuresError);
          res.status(featuresResponse.statusCode).send(featuresError);
        }
      });
    } else {
      console.error("Error getting track:", error);
      res.status(trackResponse.statusCode).send(error);
    }
  });
  
});

// Get user info
app.get('/api/user/info', function(req, res) {
  const token = req.query.token;
  if (req.session.user) {
    res.send(req.session.user);
  } else {
    const options = {
      url: 'https://api.spotify.com/v1/me',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    };
    request.get(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        req.session.user = JSON.parse(body);
        req.session.save();
        res.send(body);
      } else {
        res.status(response.statusCode).send(error);
      }
    });
  }
});

// Create a new playlist and add the selected track to it
app.post('/api/playlists/create', function(req, res) {
  const { token, userId, playlistName } = req.body;
  const options = {
    url: `https://api.spotify.com/v1/users/${userId}/playlists`,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: playlistName })
  };
  request.post(options, (error, response, body) => {
    if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
      const responseBody = JSON.parse(body);
      const playlistId = responseBody.id;

      // Add the selected track to the newly created playlist
      const trackURIs = [req.session.track.uri];
      const addTrackOptions = {
        url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ uris: trackURIs })
      };
      request.post(addTrackOptions, (addTrackError, addTrackResponse, addTrackBody) => {
        if (!addTrackError && (addTrackResponse.statusCode === 201 || addTrackResponse.statusCode === 200)) {

          // Fetch the newly created playlist
          const playlistOptions = {
            url: `https://api.spotify.com/v1/playlists/${playlistId}`,
            headers: {
              'Authorization': 'Bearer ' + token
            }
          };
          request.get(playlistOptions, (playlistError, playlistResponse, playlistBody) => {
            if (!playlistError && playlistResponse.statusCode === 200) {
              const playlist = JSON.parse(playlistBody);
              
              // Update the playlist's features
              playlist.features = req.session.track.features;

              // Attach the track to the playlist
              playlist.songs = [req.session.track];

              // Update the playlist's compatibility in the session
              playlist.compatibility = 100;

              // Store the playlist in the session management 
              // (as the first element, as its the newest playlist and most compatible with the track)
              req.session.comp_playlists.unshift(playlist);
              req.session.playlists.unshift(playlist);  
              req.session.save();

              res.send(playlist);
            } else {
              console.error("Error fetching created playlist:", playlistError);
              res.status(playlistResponse.statusCode).send(playlistError);
            }
          });
        } else {
          console.error("Error adding track to playlist:", addTrackError);
          res.status(addTrackResponse.statusCode).send(addTrackError);
        }
      });
    } else {
      console.error("Error creating playlist:", error);
      res.status(response.statusCode).send(error);
    }
  });
});


// Add tracks to playlist
app.post('/api/playlists/:playlistId/add-tracks', function(req, res) {
  const { token, trackURIs } = req.body;
  const { playlistId } = req.params;
  const options = {
    url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris: trackURIs })
  };
  request.post(options, (error, response, body) => {
    if (!error && (response.statusCode === 201 || response.statusCode == 200)) {
      // Fetch the updated playlist data
      const playlistOptions = {
        url: `https://api.spotify.com/v1/playlists/${playlistId}`,
        headers: {
          'Authorization': 'Bearer ' + token
        }
      };
      request.get(playlistOptions, (playlistError, playlistResponse, playlistBody) => {
        if (!playlistError && playlistResponse.statusCode === 200) {
          const updatedPlaylist = JSON.parse(playlistBody);

          // Find the index of the playlist in the session data
          const playlistIndex = req.session.comp_playlists.findIndex(p => p.id === playlistId);
          if (playlistIndex !== -1) {
            // Attach the songs property from the previous playlist
            updatedPlaylist.songs = req.session.playlists[playlistIndex].songs;
            // Attach the newly added track to the songs
            updatedPlaylist.songs.push(req.session.track);
            // Recalculate average features for the updated playlist
            const updatedPlaylistFeatures = calculatePlaylistAverages(updatedPlaylist.songs.map(item => item.features));
            // Recalculate compatibility with the track
            const track = req.session.track;
            const compatibility = calculateCompatibility(track.features, updatedPlaylistFeatures);
            // Update the playlist's average features and compatibility in the session
            updatedPlaylist.features = updatedPlaylistFeatures;
            updatedPlaylist.compatibility = compatibility;
            // Update the playlist data in the session
            req.session.playlists[playlistIndex] = updatedPlaylist;
            req.session.comp_playlists[playlistIndex] = updatedPlaylist;
            req.session.save();
            // Send the updated playlist data back to the client
            res.send(updatedPlaylist);
          } else {
            res.status(404).send("Playlist not found");
          }
        } else {
          console.error("Error fetching updated playlist:", playlistError);
          res.status(playlistResponse.statusCode).send(playlistError);
        }
      });
    } else {
      console.error("Error adding tracks to playlist:", error);
      res.status(response.statusCode).send(error);
    }
  });
});





/*                      REGULAR FUNCTIONS                         */


// Function to calculate the similarity of a track's and a playlist's features
function calculateCompatibility(trackFeatures, playlistAverages) {
  let sum = 0;
  // Keep track of the number of features included in the calculation
  let count = 0; 
  for (const feature of Object.keys(trackFeatures)) {
    // Check if the feature is not filtered out
    if (!['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms', 'key', 'loudness', 
        'tempo', 'time_signature'].includes(feature)) {
      sum += Math.pow(trackFeatures[feature] - playlistAverages[feature], 2);
      count++; 
    }
  }
  // Calculate similarity based on included features
  return Math.round((1 - Math.sqrt(sum / count)) * 100); 
}


// Function to find the best suitable playlist for a track
function findBestFitPlaylist(track, playlists) {
  console.log("in findbestfitplaylist");
  let bestFitPlaylist = null;
  let maxCompatibility = -Infinity;
  // Iterate through each playlist
  playlists.forEach((playlist) => {
    // Calculate compatibility of track with playlist
    const compatibility = calculateCompatibility(track.features, playlist.features);
    // Update best fit if compatibility is higher
    if (compatibility > maxCompatibility) {
      bestFitPlaylist = playlist;
      maxCompatibility = compatibility;
    }
  });
  // Attach best fit playlist to the track object
  track.bestfit = bestFitPlaylist;
  return track;
}

// Function to find best fit playlists for all tracks in all playlists
function findBestFitPlaylists(playlists) {
  console.log("in findbestfitplaylists");
  // Iterate through each playlist
  playlists.forEach((playlist) => {
    // Iterate through each track in the playlist
    playlist.song.forEach((track) => {
      // Find the best fit playlist for the track
      findBestFitPlaylist(track, playlists);
    });
  });
  return playlists;
}

// Function to calculate average features for a list of tracks
function calculatePlaylistAverages(trackFeatures) {
  const totalTracks = trackFeatures.length;
  const averageFeatures = {};
  const excludedFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms']; // Define features to exclude

  trackFeatures.forEach((track) => {
    for (const key in track) {
      if (track.hasOwnProperty(key) && !excludedFeatures.includes(key)) { // Check if the feature should be excluded
        averageFeatures[key] = (averageFeatures[key] || 0) + track[key];
      }
    }
  });

  for (const key in averageFeatures) {
    if (averageFeatures.hasOwnProperty(key)) {
      averageFeatures[key] /= totalTracks;
    }
  }

  return averageFeatures;
}

// Function to normalize features
function normalizeFeatures(features) {
  const normalizedFeatures = {};
  const minMaxValues = {
    "acousticness": [0, 1],
    "danceability": [0, 1],
    "energy": [0, 1],
    "instrumentalness": [0, 1],
    "key": [-1, 11],
    "liveness": [0, 1],
    "loudness": [-60, 0],
    "mode": [0, 1],
    "speechiness": [0, 1],
    "tempo": [70, 169],
    "time_signature": [3, 7],
    "valence": [0, 1]
  };
  for (const feature in minMaxValues) {
    if (features.hasOwnProperty(feature)) {
      const value = features[feature];
      const [min, max] = minMaxValues[feature];
      normalizedFeatures[feature] = (value - min) / (max - min);
    }
  }
  return normalizedFeatures;
}

/* 

REMOVED, AS FILTERING OUT UNECESSARY FEATURES IS MORE EFFECTIVELY IMPLEMENTED
IN OTHER FUNCTIONS

// Function to filter out unnecessary features from track features
function filterFeatures(trackFeatures) {
  const filteredTrackFeatures = trackFeatures.map((track) => {
    const filteredTrack = {};
    for (const key in track) {
      if (track.hasOwnProperty(key) && !['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms'].includes(key)) {
        filteredTrack[key] = track[key];
      }
    }
    return filteredTrack;
  });
  return filteredTrackFeatures;
}
*/

app.listen(3000, () => { 
	console.log('Server listening on port 3000'); 
});