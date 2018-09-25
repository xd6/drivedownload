import Media from './media';
import Record from './record';
import Promise from 'bluebird';

const MAX_RECORD_AGE = 1;// (1000 * 60 * 60) * 24;

async function run() {
  const t0 = Date.now();

  const record = new Record();
  if (record.getRecordAge() < MAX_RECORD_AGE) {
    console.log('Updated recently enough');
    process.exit('done');
  }
  await record.openQueue();


  const media = new Media();
  await media.auth();

  async function loadMediaItems(pageToken) {
    let { mediaItems, nextPageToken } = await media.getMediaItems(pageToken, 25);
    if (mediaItems.length) {
      writeMediaItems(mediaItems);
    }
    if (nextPageToken) {
      return loadMediaItems(nextPageToken);
    }
    return null;
  }

  const writeJobs = [];
  async function writeMediaItems(mediaItems) {
    writeJobs.push(Promise.map(mediaItems, async mediaItem => {
      await media.downloadMediaItem(mediaItem);
      return record.addRecord(mediaItem.id)
    }, { concurrency: 5 }));
  }

  await loadMediaItems();

  await Promise.all(writeJobs);

  await record.close();

  console.log('wrote %d records', record.written);

  console.log('elapsed: %ds', (Date.now() - t0) / 1000);
}

module.exports = { run };