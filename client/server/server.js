const express = require('express'); 
const request = require('request');
const crypto = require('crypto');
const session = require('express-session');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express(); 

const port = 1000;

var client_id = 'a52b1c6ae851463b8614c146866ecf5d';
var client_secret = '971ded7463eb4998b5d5d269a02a3022';
var basePath = '/home';
var stateKey = 'spotify_auth_state';


const generateRandomString = (length) => {
    return crypto
    .randomBytes(60)
    .toString('hex')
    .slice(0, length);
}


/*                DATABASE SETUP                   */

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

const serviceAccount = require('./choordify-37264-633a79bc20d2.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();






/*               MIDDLEWARE SETUP                */


 app.use(session({
  secret: 'muumitroll',
  resave: false,
  saveUninitialized: true
}));


app.use(express.static(path.join(__dirname, '../dist/client/browser')));
//app.use(express.static(__dirname + '../client'));
app.use(cookieParser());
app.use(express.json({ limit: '100mb' }));



/*                    API CALL FUNCTIONS                    */


app.get("/spotify/auth", function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  var scope =
    "user-read-private user-read-email playlist-read-private playlist-modify-public playlist-modify-private";
  
  var redirect_uri = req.protocol + '://' + req.get('host') + '/callback';
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
    var redirect_uri = req.protocol + '://' + req.get('host') + '/callback';

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
  db.collection('playlists').get()
  .then(snapshot => {
    if (!snapshot.empty) {
      const playlists = [];
      snapshot.forEach(doc => {
        playlists.push(doc.data());
      });
    res.send(playlists);
    } 
    else {
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
                  playlist.songs = trackItems.map(item => item.track);
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
                        const features = trackFeatures[index];
                        const {filteredFeatures, enlargedFeatures} = filterFeatures(features);
                        song.features = filteredFeatures; 
                        song.enlargedFeatures = enlargedFeatures;
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
          Promise.all(trackFeaturePromises).then((playlistTracksFeatures) => {
                // Calculate average features for each playlist
                const playlistsWithAverages = playlists.map((playlist, index) => {
                const trackFeatures = playlistTracksFeatures[index];
                const { averageFeatures, enlargedFeatures } = calculatePlaylistAverages(trackFeatures);
                playlist.features = averageFeatures;
                playlist.enlargedFeatures = enlargedFeatures;
                // Save playlists in Firebase 
                db.collection('playlists').doc(playlist.id).set(playlist)
                  .then(() => {
                    console.log("Playlist saved to Firestore:", playlist.id);
                  })
                  .catch((error) => {
                    console.error("Error saving playlist to Firestore:", error);
                  });
                return playlist;
              });
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
});


// Request for 50 more tracks of selected playlist
app.get('/api/load-more-tracks', function(req, res) {
  const { token } = req.query;
  const playlist = req.session.playlist;
  const playlistId = playlist.id;
  const offset = playlist.songs.length;
  const tracksOptions = {
    url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=${offset}`,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };

  request.get(tracksOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const trackItems = JSON.parse(body).items;
      const songs = trackItems.map(item => item.track);
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
          songs.forEach((song, index) => {
            const features = trackFeatures[index];
            const {filteredFeatures, enlargedFeatures} = filterFeatures(features);
            song.features = filteredFeatures; 
            song.enlargedFeatures = enlargedFeatures;
          });
          playlist.songs = playlist.songs.concat(songs);
          findBestFitPlaylist(playlist, req.session.playlists);
          const playlistIndex = req.session.playlists.findIndex(p => p.id === playlist.id);
          req.session.playlists[playlistIndex] = playlist;
          if (req.session.comp_playlists) {
            const comp_playlistIndex = req.session.comp_playlists.findIndex(p => p.id === playlist.id);
            req.session.comp_playlists[comp_playlistIndex] = playlist;
          }
          req.session.playlist = playlist;
          req.session.save(); 
          res.send(playlist);
        } else {
          res.status(response.statusCode).send(error);
        }
      });
    } else {
      res.status(response.statusCode).send(error);
    }
  });
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

// Store chosen playlist
app.post('/api/store_playlist', function(req, res) {
  const playlist = req.body; 
  db.collection('playlist').doc('chosen_playlist').set(playlist)
  .then(() => {
    console.log("Playlist stored successfully:", playlist.id);
    res.status(200).send("Playlist stored successfully");
  })
  .catch(error => {
    console.error("Error storing playlist:", error);
    res.status(500).send(error);
  });
});

// Return previously stored playlist
app.get('/api/stored_playlist', function(req, res) {
  db.collection('playlist').get('chosen_playlist')
    .then(snapshot => {
      if (!snapshot.empty) {
        const playlistDoc = snapshot.docs[0];
        const playlist = playlistDoc.data();
        if (!playlist.songs[0].best_fit){
          db.collection('playlists').get()
          .then(snapshot2 => {
            const playlists = [];
            snapshot2.forEach(doc => {
              playlists.push(doc.data());
            });
            findBestFitPlaylist(playlist, playlists);
            const playlistIndex = playlists.findIndex(p => p.id === playlist.id);
            console.log(playlistIndex);
            res.send(playlist);
          })
        }
        else {
          res.send(playlist); // Send the playlist data as the response
        }
      } else {
        console.log("No playlist found");
        res.status(404).send("No playlist found");
      }
    })
    .catch(error => {
      console.error("Error getting stored playlist:", error);
      res.status(500).send(error);
    });
});

// Return previously stored playlists, with compatibility measures and appropriate sorting
app.get('/api/comp_playlists', function(req, res) {
  db.collection('comp_playlist').get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const comp_playlistDoc = snapshot.docs[0];
        const comp_playlists = comp_playlistDoc.data();
        res.send(comp_playlists);
      } else {
        res.status(404).send("No playlists found");
      }
  })
  .catch(error => {
    console.error("Error getting stored comp playlists:", error);
    res.status(500).send(error);
  });
});

// Return previously stored track
app.get('/api/stored_track', function(req, res) {
  db.collection('track').get()
  .then(snapshot => {
    if (!snapshot.empty) {
      const trackDoc = snapshot.docs[0];
      const track = trackDoc.data();
      res.send(track);
    } else {
      res.status(404).send("No track found");
    }
  })
  .catch(error => {
    console.error("Error getting stored track:", error);
    res.status(500).send(error);
  });
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

          const {filteredFeatures, enlargedFeatures} = filterFeatures(features);
          // Attach the normalized features to the track object
          track.features = filteredFeatures;
          track.enlargedFeatures = enlargedFeatures;

          // Calculate compatibility of each playlist with the track features
          let playlists = req.session.playlists.slice();

          playlists.forEach((playlist) => {
            const compatibility = calculateCompatibility(features, playlist.features);
            playlist.compatibility = compatibility;
            // Store playlists and track in database
            db.collection('comp_playlists').doc(playlist.compatibility).set(playlist)
            .then(() => {
              console.log("Playlist saved to Firestore:", playlist.id);
            })
            .catch((error) => {
              console.error("Error saving playlist to Firestore:", error);
            });
          });
          /*
          // Order playlists based on compatibility
          playlists.sort((a, b) => {
            // If either of the playlist has no songs, move it to the end of the list
            if (!a.tracks || a.tracks['total'] === 0) return 1;
            if (!b.tracks || b.tracks['total'] === 0) return -1; 
            // Otherwise, sort based on compatibility
            return b.compatibility - a.compatibility;
          });
          */
          db.collection('track').doc('selected_track').set(track)
          .then(() => {
            console.log("Track saved to Firestore:", track.id);
          })
          .catch((error) => {
            console.error("Error saving track to Firestore:", error);
          });
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
  db.collection('user').get()
  .then(snapshot => {
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const user = userDoc.data();
      res.send(user);
    } else {
      const options = {
        url: 'https://api.spotify.com/v1/me',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      };
      request.get(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const user = JSON.parse(body);
          db.collection('user').doc(user.id).set(user)
          .then(() => {
            console.log("User saved to Firestore:", user.id);
          })
          .catch((error) => {
            console.error("Error saving track to Firestore:", error);
          });
          res.send(body);
        } else {
          res.status(response.statusCode).send(error);
        }
      });
    }
  }).catch((error) => {
    console.error("Error getting user from Firestore:", error);
  });
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
            if (!playlistError && (playlistResponse.statusCode === 200 || playlistResponse.statusCode === 201)) {
              const playlist = JSON.parse(playlistBody);
              // Update the playlist's features
              playlist.features = req.session.track.features;
              playlist.enlargedFeatures = req.session.track.enlargedFeatures;
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


// Add tracks to playlist (on compatibility page)
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
          const playlistIndex = req.session.playlists.findIndex(p => p.id === playlistId);
          const comp_playlistIndex = req.session.comp_playlists.findIndex(p => p.id === playlistId);
          if (playlistIndex !== -1) {
            // Attach the songs property from the previous playlist
            updatedPlaylist.songs = req.session.playlists[playlistIndex].songs;
            // Attach the newly added track to the songs
            updatedPlaylist.songs.push(req.session.track);
            // Recalculate average features for the updated playlist
            const { averageFeatures, enlargedFeatures } = calculatePlaylistAverages(updatedPlaylist.songs.map(item => item.features));
            // Recalculate compatibility with the track
            const track = req.session.track;
            updatedPlaylist.compatibility = calculateCompatibility(track.features, averageFeatures);
            // Update the playlist's average features in the session
            updatedPlaylist.features = averageFeatures;
            updatedPlaylist.enlargedFeatures = enlargedFeatures;
            // Update the playlist data in the session
            req.session.playlists[playlistIndex] = updatedPlaylist;
            req.session.comp_playlists[comp_playlistIndex] = updatedPlaylist;
            req.session.save();
            // Send the updated playlists data back to the client
            res.send(req.session.comp_playlists);
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

// Remove a track from a playlist (on playlist page)
app.delete('/api/playlists/:playlistId/remove-tracks', function(req, res) {
  const { token, trackURI } = req.body;
  const { playlistId } = req.params;
  const options = {
    url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tracks: [{ uri: trackURI }] })
  };
  request.delete(options, (error, response, body) => {
    if (!error && (response.statusCode === 200 || response.statusCode === 204)) {
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
          const playlistIndex = req.session.playlists.findIndex(p => p.id === playlistId);
          if (playlistIndex !== -1) {
            // Find the original playlist from session data, remove the removed song
            const originalPlaylist = req.session.playlists[playlistIndex];
            const updatedSongs = originalPlaylist.songs.filter(song => song.uri !== trackURI);
            updatedPlaylist.songs = updatedSongs;
            // Recalculate average features for the updated playlist
            const { averageFeatures, enlargedFeatures } = calculatePlaylistAverages(updatedPlaylist.songs.map(item => item.features));
            updatedPlaylist.features = averageFeatures;
            updatedPlaylist.enlargedFeatures = enlargedFeatures;
            // Update the playlist data in the session
            req.session.playlists[playlistIndex] = updatedPlaylist;
            req.session.playlist = updatedPlaylist;
            if (req.session.comp_playlists) {
              const comp_playlistIndex = req.session.comp_playlists.findIndex(p => p.id === playlistId);
              req.session.comp_playlists[comp_playlistIndex] = updatedPlaylist;
            }
            req.session.save();
            // Send the updated playlist data back to the client
            res.send(req.session.playlist);
          }
          else {
            res.status(404).send("Playlist not found");
          }
        } else {
          console.error("Error fetching updated playlist:", playlistError);
          res.status(playlistResponse.statusCode).send(playlistError);
        }
      });
    } else {
      console.error("Error removing track from playlist:", error);
      res.status(response.statusCode || 500).send(error);
    }
  });
});

// Add track to playlist (on playlist page)
app.post('/api/playlists/:playlistId/add-track', function(req, res) {
  const { token, track } = req.body;
  const { playlistId } = req.params;
  const options = {
    url: `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uris: [ track.uri ] })
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
          const playlistIndex = req.session.playlists.findIndex(p => p.id === playlistId);
          if (playlistIndex !== -1) {
            // Attach the songs property from the previous playlist
            updatedPlaylist.songs = req.session.playlists[playlistIndex].songs;
            // Attach the newly added track to the songs property
            updatedPlaylist.songs.push(track);
            // Recalculate average features for the updated playlist
            const { averageFeatures, enlargedFeatures } = calculatePlaylistAverages(updatedPlaylist.songs.map(item => item.features));
            updatedPlaylist.features = averageFeatures;
            updatedPlaylist.enlargedFeatures = enlargedFeatures;
            // Update the playlist data in the session
            req.session.playlists[playlistIndex] = updatedPlaylist;
            if (req.session.comp_playlists) {
              const comp_playlistIndex = req.session.comp_playlists.findIndex(p => p.id === playlistId);
              req.session.comp_playlists[comp_playlistIndex] = updatedPlaylist;
            }
            req.session.save();
            // Send the updated playlists data back to the client
            res.send(req.session.comp_playlists);
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


/*
// Remove the track from the playlist in session management
      const playlistIndex = req.session.playlists.findIndex(p => p.id === playlistId);
      if (playlistIndex !== -1) {
        const updatedPlaylist = req.session.playlists[playlistIndex];
        delete updatedPlaylist.best_fit;
        const updatedSongs = updatedPlaylist.songs.filter(song => song.uri !== trackURI);
        updatedPlaylist.songs = updatedSongs;
        // Update the song count 
        updatedPlaylist.tracks.total = updatedSongs.length;
        const updatedPlaylistFeatures = calculatePlaylistAverages(updatedPlaylist.songs.map(item => item.features));
        updatedPlaylist.features = updatedPlaylistFeatures;
        findBestFitPlaylist(updatedPlaylist, req.session.playlists);
        if (req.session.comp_playlists) {
          req.session.comp_playlists[playlistIndex] = updatedPlaylist;
        }
        req.session.playlists[playlistIndex] = updatedPlaylist;
        req.session.playlist = updatedPlaylist;
        req.session.save();


*/

/*                      REGULAR FUNCTIONS                         */


// Function to calculate the similarity of a track's and a playlist's features
function calculateCompatibility(trackFeatures, playlistAverages) {
  let sum = 0;
  // Keep track of the number of features included in the calculation
  let count = 0; 
  for (const feature of Object.keys(trackFeatures)) {
    // Check if the feature is not filtered out
    if (!['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms', 'key', 'loudness', 
        'tempo', 'time_signature', 'mode'].includes(feature)) {
      sum += Math.pow(trackFeatures[feature] - playlistAverages[feature], 2);
      count++; 
    }
  }
  // Calculate similarity based on included features
  return Math.round((1 - Math.sqrt(sum / count)) * 100); 
}


// Function to find the best suitable playlist for a track
function findBestFitPlaylist(playlist, playlists) {
  const lastSongs = playlist.songs.slice(-50);
  lastSongs.forEach((song) => {
    let bestFitPlaylist = null;
    let maxCompatibility = -Infinity;
    // Initializing the boolean of whether to show additional information about a song
    song.more = false;
    // Iterate through each playlist
    playlists.forEach((playlist2) => {
      // Calculate compatibility of track with playlist
      const compatibility = calculateCompatibility(song.features, playlist2['features']);
      if (compatibility > maxCompatibility) {
        bestFitPlaylist = playlist2;
        maxCompatibility = compatibility;
      }
      if (playlist2['name'] == playlist['name']) {
        song.current_compatibility = compatibility;
      }
    });
    if (bestFitPlaylist.name == playlist.name || song.current_compatibility == maxCompatibility) {
      song.shouldMove = false;
      song.warning = false;
    }
    else {
      song.shouldMove = true;
      if ((maxCompatibility - song.current_compatibility) > 20 ) {
        song.warning = true;
      }
      else {
        song.warning = false;
      }
    }
    song.best_fit = bestFitPlaylist;
    song.max_compatibility = maxCompatibility;
  });
}


// Function to calculate average features for a list of tracks
function calculatePlaylistAverages(trackFeatures) {
  const totalTracks = trackFeatures.length;
  const averageFeatures = {};
  const enlargedFeatures = {};
  const excludedFeatures = ['analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms', 'key', 'loudness', 
  'tempo', 'time_signature', 'mode']; 

  trackFeatures.forEach((track) => {
    for (const key in track) {
      if (track.hasOwnProperty(key) && !excludedFeatures.includes(key)) { 
        averageFeatures[key] = (averageFeatures[key] || 0) + track[key];
        enlargedFeatures[key] = averageFeatures[key] * 100;
      }
    }
  });
  for (const key in averageFeatures) {
    if (averageFeatures.hasOwnProperty(key)) {
      averageFeatures[key] /= totalTracks;
      enlargedFeatures[key] /= totalTracks;
      const valueString = enlargedFeatures[key].toString(); 
      enlargedFeatures[key] = valueString.substring(0, 5);
    }
  }
  return {averageFeatures, enlargedFeatures};
}

// Function to filter out unnecessary features from track features
function filterFeatures(features) {
  const excludedFeatures = [
    'analysis_url', 'id', 'track_href', 'type', 'uri', 'duration_ms', 'key',
    'loudness', 'tempo', 'time_signature', 'mode'
  ];

  const filteredFeatures = {};
  const enlargedFeatures = {};

  for (const key in features) {
    if (!excludedFeatures.includes(key)) {
      filteredFeatures[key] = features[key];
      enlargedFeatures[key] = (features[key] * 100).toString().substring(0, 5);
    }
  }
  return {filteredFeatures, enlargedFeatures};
}



app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/client/browser/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});