import { OAuth2Client } from './node_modules/google-auth-library';
import request from 'request-promise';
import { writeFileSync } from 'fs';
const auth = require('./auth').default;
const { google } = require('googleapis');

const API_ENDPOINT = 'https://photoslibrary.googleapis.com/v1/'
let Authorization;

function apiUrl(path) {
    return `${API_ENDPOINT}${path.replace(/^\//, '')}`;
}

async function listLibrary(pageToken) {
    console.log({ Authorization });
    const uri = apiUrl('mediaItems:search');
    console.log({ uri });
    let { mediaItems, nextPageToken } = await request(
        uri,
        {
            json: true,
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
                Authorization,
            },
            body: {
                pageSize: 100,
                pageToken,
            }
        });
    if (mediaItems.length && nextPageToken) {
        mediaItems = mediaItems.concat(await listLibrary(nextPageToken));
    }
    writeFileSync('out.json', JSON.stringify(mediaItems, null, 2));
    return mediaItems;
}

/** @type {OAuth2Client} */
// const oAuth2Client = await auth();
auth().then(async (oAuth2Client) => {
    Authorization = `Bearer ${(await oAuth2Client.getAccessToken()).token}`;
    console.log(await listLibrary());
});