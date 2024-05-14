const express = require('express'); 
const request = require('request');
const crypto = require('crypto');
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
  const token = req.params.token;
  db.collection('session').doc(token).collection('playlists').get()
  .then(snapshot => {
    if (!snapshot.empty) {
      const playlistPromises = snapshot.docs.map(doc => Promise.resolve(doc.data()));
      return Promise.all(playlistPromises);
    } else {    
      console.log("getting playlists with api call");    
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
            filterPlaylistFields(playlist);

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
                        filterTrackFields(song);
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
                playlists.map((playlist, index) => {
                const trackFeatures = playlistTracksFeatures[index];
                const { averageFeatures, enlargedFeatures } = calculatePlaylistAverages(trackFeatures);
                playlist.features = averageFeatures;
                playlist.enlargedFeatures = enlargedFeatures;
                // Save playlists in Firebase 
                db.collection('session').doc(token).collection('playlists').doc(playlist.id).set(playlist)
                  .then(() => {})
                  .catch((error) => {
                    console.error("Error saving playlist to Firestore:", error);
                  });
                return playlist;
              });
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
  }).then(playlists => {
    res.send(playlists);
  })
});

// Request for 50 more tracks of selected playlist
app.get('/api/load-more-tracks', function(req, res) {
  const { token } = req.query;
  db.collection('session').doc(token).collection('playlist').doc('chosen_playlist').get()
  .then(snapshotPL => {
    const playlist = snapshotPL.data();
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
              filterTrackFields(song);
            });
            playlist.songs = playlist.songs.concat(songs);
            db.collection('session').doc(token).collection('playlists').get()
            .then(snapshot => {
              const playlistPromises = snapshot.docs.map(doc => Promise.resolve(doc.data()));
              return Promise.all(playlistPromises);
            }).then(playlists => {      
               findBestFitPlaylist(playlist, playlists);
                db.collection('session').doc(token).collection('playlists').doc(playlist.id).set(playlist)
              .then(() => {
                res.send(playlist);
              })
              .catch(error => {
                console.error("Error storing playlist:", error);
                res.status(500).send(error);
              });
            });  
          } else {
            res.status(response.statusCode).send(error);
          }
        });
      } else {
        res.status(response.statusCode).send(error);
      }
    });
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

// Return chosen playlist
app.get('/api/playlist/:playlistId', function(req, res) {
  const { playlistId } = req.params;
  const { token } = req.query;
  db.collection('session').doc(token).collection('playlists').doc(playlistId).get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const playlist = snapshot.data();
        if (!playlist.songs[0] || !playlist.songs[0].best_fit){
          const { token } = req.query;
          db.collection('session').doc(token).collection('playlists').get()
          .then(snapshot2 => {
            const playlistPromises = snapshot2.docs.map(doc => Promise.resolve(doc.data()));
            return Promise.all(playlistPromises);
          }).then(playlists => {
            findBestFitPlaylist(playlist, playlists);
            res.send(playlist); 
          })
             // Update the playlist in the 'playlists' collection
            /** 
            db.collection('playlists').doc(playlist.id).update({
              songs: playlist.songs
            })
            .then(() => {
              console.log("Playlist updated in 'playlists' collection");
              res.send(playlist); 
            })
            .catch(error => {
              console.error("Error updating playlist in 'playlists' collection:", error);
              res.status(500).send(error);
            });
            */
        } else {
          res.send(playlist);
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
  const { token } = req.query;
  db.collection('session').doc(token).collection('playlists').get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const playlistPromises = snapshot2.docs.map(doc => Promise.resolve(doc.data()));
        return Promise.all(playlistPromises);
      } else {
        res.status(404).send("No playlists found");
      }
    }).then(playlists => {
      playlists.sort((a, b) => (b.compatibility || 0) - (a.compatibility || 0));
      res.send(playlists);
    }).catch(error => {
    console.error("Error getting stored comp playlists:", error);
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
          filterTrackFields(track);
          // Calculate compatibility of each playlist with the track features
          db.collection('session').doc(token).collection('playlists').get()
          .then(snapshot => {
            if (!snapshot.empty) {
              const playlistPromises = snapshot.docs.map(doc => Promise.resolve(doc.data()));
              return Promise.all(playlistPromises);
            }
          }).then(playlists => {
            playlists.forEach((playlist) => {
              const compatibility = calculateCompatibility(features, playlist['features']);
              playlist.compatibility = compatibility;
              // Store playlists and track in database
              db.collection('session').doc(token).collection('playlists').doc(playlist.id).set(playlist)
              .then(() => {})
              .catch((error) => {
                console.error("Error saving playlist to Firestore:", error);
              });
            });
            db.collection('session').doc(token).collection('track').doc(trackId).set(track)
            .then(() => {})
            .catch((error) => {
              console.error("Error saving track to Firestore:", error);
            });
            res.send(track);
          });
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
  db.collection('session').doc(token).collection('user').get()
  .then(snapshot => {
    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const user = userDoc.data();
      res.send(user);
    } else {
      console.log("getting user with api call");
      const options = {
        url: 'https://api.spotify.com/v1/me',
        headers: {
          'Authorization': 'Bearer ' + token
        }
      };
      request.get(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const user = JSON.parse(body);
          db.collection('session').doc(token).collection('user').doc(user.id).set(user)
          .then(() => {
            res.send(body);
          })
          .catch((error) => {
            console.error("Error saving user Firestore:", error);
          });
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
      db.collection('session').doc(token).collection('track').doc('selected_track').get()
      .then(snapshot => {
        if (!snapshot.empty) {
          const track = snapshot.data();
          const trackURIs = [track.uri];
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
                  playlist.features = track.features;
                  playlist.enlargedFeatures = track.enlargedFeatures;
                  filterPlaylistFields(playlist);
                  // Attach the track to the playlist
                  playlist.songs = [track];
                  // Update the playlist's compatibility in the session
                  playlist.compatibility = 100;
                  // Store the playlist in the database
                  db.collection('session').doc(token).collection('playlists').doc(playlist.id).set(playlist)
                  .then(() => {
                    res.send(playlist);
                  })
                  .catch((error) => {
                    console.error("Error saving playlist to Firestore:", error);
                  });
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
        }
      }).catch((error) => {
        console.error("Error getting track from Firestore:", error);
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
          db.collection('session').doc(token).collection('playlists').doc(updatedPlaylist.id).get()
          .then(snapshot => {
            const oldPlaylist = snapshot.data();
            // Attach the songs property from the previous playlist
            updatedPlaylist.songs = oldPlaylist.songs;
            db.collection('session').doc(token).collection('track').doc('selected_track').get()
            .then(songSnapshot => {
              const track = songSnapshot.data();
              filterTrackFields(track);
              // Attach the newly added track to the songs
              updatedPlaylist.songs.push(track);
              // Recalculate average features for the updated playlist
              const { averageFeatures, enlargedFeatures } = calculatePlaylistAverages(updatedPlaylist.songs.map(item => item.features));
              // Recalculate compatibility with the track
              updatedPlaylist.compatibility = calculateCompatibility(track.features, averageFeatures);
              // Update the playlist's average features
              updatedPlaylist.features = averageFeatures;
              updatedPlaylist.enlargedFeatures = enlargedFeatures;
              // Update the playlist data in the db
              db.collection('session').doc(token).collection('playlists').doc(updatedPlaylist).set(updatedPlaylist)
              .then(() => {
                // Send the updated playlists data back to the client
                db.collection('session').doc(token).collection('playlists').get()
                .then(snapshot => {
                  if (!snapshot.empty) {
                    const playlistPromises = snapshot2.docs.map(doc => Promise.resolve(doc.data()));
                    return Promise.all(playlistPromises);
                    }
                }).then(playlists => {
                  playlists.sort((a, b) => b.compatibility - a.compatibility);
                  res.send(playlists);
                });
              })
              .catch((error) => {
                console.error("Error saving playlist to Firestore:", error);
              });
            })
          })
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
          db.collection('session').doc(token).collection('playlists').doc(updatedPlaylist.id).get()
          .then(snapshot => {
            const originalPlaylist = snapshot.data();
            const updatedSongs = originalPlaylist.songs.filter(song => song.uri !== trackURI);
            updatedPlaylist.songs = updatedSongs;
            // Recalculate average features for the updated playlist
            const { averageFeatures, enlargedFeatures } = calculatePlaylistAverages(updatedPlaylist.songs.map(item => item.features));
            updatedPlaylist.features = averageFeatures;
            updatedPlaylist.enlargedFeatures = enlargedFeatures;
            filterPlaylistFields(updatedPlaylist);
            // Update the playlist data in the Firestore database
            db.collection('session').doc(token).collection('playlists').doc(updatedPlaylist.id).set(updatedPlaylist)
            .then(() => {
              res.send(updatedPlaylist);
            })
            .catch((error) => {
              console.error("Error saving playlist to Firestore:", error);
            });
          });
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
          db.collection('session').doc(token).collection('playlists').doc(updatedPlaylist.id).get()
          .then(snapshot => {
            const oldPlaylist = snapshot.data();
            // Attach the songs property from the previous playlist
            updatedPlaylist.songs = oldPlaylist.songs;
            // Attach the newly added track to the songs property
            updatedPlaylist.songs.push(track);
            // Recalculate average features for the updated playlist
            const { averageFeatures, enlargedFeatures } = calculatePlaylistAverages(updatedPlaylist.songs.map(item => item.features));
            updatedPlaylist.features = averageFeatures;
            updatedPlaylist.enlargedFeatures = enlargedFeatures;
            filterPlaylistFields(updatedPlaylist);
            // Update the playlist data in the Firebase database
            db.collection('session').doc(token).collection('playlists').doc(updatedPlaylist.id).set(updatedPlaylist)
            .then(() => {
              db.collection('session').doc(token).collection('playlists').get()
              .then(snapshot2 => {
                const playlistPromises = snapshot2.docs.map(doc => Promise.resolve(doc.data()));
                return Promise.all(playlistPromises);
              }).then(playlists => {
                res.send(playlists);
              }).catch((error) => {
                console.error("Error saving playlist to Firestore:", error);
              })
            });
          });
        } else {
          res.status(404).send("Playlist not found");
        }
      });
    } else {
      console.error("Error adding tracks to playlist:", error);
      res.status(response.statusCode).send(error);
    }
  });
});

// Deletes the session's data from the database
app.delete('/api/log_out', function(req, res) {
  const { token } = req.query;
  console.log("here")
  db.collection('session').doc(token).delete();
  db.collection('session').doc(token).collection('playlist').delete();
  db.collection('session').doc(token).collection('playlists').delete();
  db.collection('session').doc(token).collection('user').delete();
  db.collection('session').doc(token).collection('track').delete();
  res.send("done");
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
      if ((maxCompatibility - song.current_compatibility) >= 20 ) {
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

// Function to filter out unnecessary fields from the playlist Object as received from Spotify
function filterPlaylistFields(playlist) {
  delete playlist.collaborative;
  delete playlist.description;
  delete playlist.external_urls;
  delete playlist.href;
  delete playlist.primary_color;
  delete playlist.snapshot_id;
  delete playlist.type;
  delete playlist.uri;
  delete playlist.owner.external_urls
  delete playlist.owner.href;
  delete playlist.owner.id;
  delete playlist.owner.type;
  delete playlist.owner.uri;
  delete playlist.uri;
  // kontrolli kas on enne pilt, aga see ka lisada
}

// Function to filter out unnecessary fields from the track Object as received from Spotify
function filterTrackFields(track) {
  delete track.available_markets;
  delete track.disc_number;
  delete track.explicit;
  delete track.external_ids;
  delete track.external_urls;
  delete track.available_markets;
  delete track.href;
  delete track.is_local;
  delete track.popularity;
  delete track.preview_url;
  delete track.track_number;
  delete track.type;
  delete track.uri;
  delete track.duration_ms;
  delete track.album.available_markets;
  delete track.album.external_urls;
  delete track.album.href;
  delete track.album.id;
  delete track.album.uri;
  delete track.album.album_type;
  delete track.album.artists;
  delete track.album.release_date;
  delete track.album.release_date_precision;
  delete track.album.total_tracks;

  // artisti nimi + kui on rohkem kui 1 artist

}

// Function to filter out unnecessary fields from the user Object as received from Spotify
function filterUserFields(user) {
  delete user.country;
  delete user.email;
  delete user.explicit_content;
  delete user.followers;
  delete user.product;
  delete user.type;
  delete user.uri;
}


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/client/browser/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});