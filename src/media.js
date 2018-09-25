import Authorize from './auth';
import Request from 'request';
import request from 'request-promise';
import { createWriteStream } from 'fs';
import Promise from 'bluebird';
import Exception from './exception';

const API_ENDPOINT = 'https://photoslibrary.googleapis.com/v1/'
const PAGE_SIZE = 5;
const OUTPUT_DIR = 'output';

export default class Media {
  oAuth2Client;
  accessToken;
  authToken;

  async auth() {
    let step = 0;
    try {
      ++step;
      this.oAuth2Client = await Authorize();
      ++step;
      this.accessToken = await this.oAuth2Client.getAccessToken();
      ++step;
      this.authToken = await `Bearer ${this.accessToken.token}`
      ++step;
    } catch (e) {
      throw new Exception(`Auth failed - step ${step}`, e);
    }
  }

  apiUrl(path) {
    return `${API_ENDPOINT}${path.replace(/^\//, '')}`;
  }

  async getMediaItems(pageToken, pageSize = PAGE_SIZE) {
    const uri = this.apiUrl('mediaItems:search');
    return request(
      uri,
      {
        json: true,
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
          Authorization: this.authToken,
        },
        body: {
          pageSize,
          pageToken,
        }
      });
  }

  async downloadMediaItem(mediaItem) {
    const ext = mediaItem.mimeType ? mediaItem.mimeType.split('/')[1] : 'png';
    return new Promise((resolve, reject) => {
      Request(mediaItem.baseUrl)
        .on('complete', resolve)
        .on('error', reject)
        .pipe(createWriteStream(`${OUTPUT_DIR}/${mediaItem.id}.${ext}`));
    });
  }
}