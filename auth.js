import { OAuth2Client } from './node_modules/google-auth-library';
import { GetTokenResponse } from './node_modules/google-auth-library/build/src/auth/oauth2client';
import readline from 'readline';
const Promise = require('bluebird');
const { google } = require('googleapis');
const fs = require('fs');

// If modifying these scopes, delete credentials.json.
const SCOPES = [
    'https://www.googleapis.com/auth/photoslibrary.readonly',
];
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @returns {Promise.<OAuth2Client>}
 */
export default async function auth() {
    const credentials = JSON.parse(fs.readFileSync('credentials.json'));

    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]
    );

    // Check if we have previously stored a token.
    try {
        const token = fs.readFileSync(TOKEN_PATH);
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    } catch (e) {
        return getAccessToken(oAuth2Client);
    }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {OAuth2Client} oAuth2Client The OAuth2 client to get token for.
 * @returns {Promise.<OAuth2Client>}
 */
async function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(async (resolve) => {
        rl.question('Enter the code from that page here: ', async (code) => {
            rl.close();
            new Promise(async () => {
                const { tokens } = await oAuth2Client.getToken(code);
                oAuth2Client.setCredentials(tokens);
                // Store the token to disk for later program executions
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
                resolve(oAuth2Client);
            });
        });
    });
}