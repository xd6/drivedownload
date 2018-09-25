import {
  readFileSync,
  createWriteStream,
  writeFileSync,
  WriteStream,
  copyFileSync
} from 'fs';
import Promise from 'bluebird';

const INDEX_LEN = 8;

const RECORD_PATH = '.record.json'

export default class Record {
  /** @type {string} */
  recordTimestamp;

  /** @type {string[]} */
  recordData;

  /** @type {{[x: string]: {[x: string]:? boolean}}} */
  recordTree;

  /** @type {WriteStream} */
  recordStream;

  ready = false;

  /**
   * @param {string} path Path to the record file
   */
  constructor(path = RECORD_PATH) {
    let fIn;
    try {
      fIn = readFileSync(path);
    } catch (e) {
      console.log('Creating record file');
      writeFileSync(path, '{"timestamp":null,"data":[]}');
      fIn = readFileSync(path);
    }

    let timestamp, data;
    try {
      ({ timestamp, data } = JSON.parse(fIn));
    } catch (e) {
      throw new Error('Invalid record file format');
    }

    this.recordData = data;
    this.init(timestamp, path);
    this.sortRecordData();
  }

  init(timestamp, path) {
    this.recordTree = {};
    this.recordPath = path;
    this.recordTimestamp = timestamp;
    this.recordStream = createWriteStream(`${path}.part`);
    this.recordStream.write = Promise.promisify(this.recordStream.write);
    this.ready = this.recordStream.write(`{"data":[0`);
  }

  sortRecordData() {
    if (!this.recordData) {
      return;
    }
    for (let recordId of this.recordData) {
      this.addRecord(recordId, false);
    }
    console.log('Read %d records', this.recordData.length);
    this.recordData = undefined;
  }

  /**
   * @param {string} recordId 
   */
  haveRecord(recordId) {
    const [head, tail] = this.splitRecordId(recordId);
    return !!(this.recordTree[head] &&
      this.recordTree[head][tail]);
  }

  getRecordAge() {
    return this.recordTimestamp > 0
      ? Date.now() - this.recordTimestamp
      : Infinity;
  }

  addRecord(recordId, write = true) {
    if (this.haveRecord(recordId)) {
      if (write) {
        console.log('Have already:', recordId);
      }
      return;
    }

    if (write) {
      this.writeRecord(recordId);
    }

    const [head, tail] = this.splitRecordId(recordId);
    if (typeof this.recordTree[head] === 'undefined') {
      this.recordTree[head] = {};
    }
    this.recordTree[head][tail] = true;
  }

  writeQueue = [];
  written = 0;
  writeRecord(recordId) {
    this.queue.push(recordId);
  }

  queue = [];
  queueStatus;
  async openQueue() {
    if (!this.queueStatus) {
      this.queueStatus = true;
      this.queueStatus = this.moveQueue();
    }
  }

  async moveQueue() {
    if (!this.queueStatus && !this.queue.length) {
      console.log('queue complete');
      return null;
    }

    if (!this.ready) {
      this.recordStream = await this.ready;
    }

    if (this.queue.length) {
      const num = Math.min(this.queue.length, 3);
      const items = this.queue.slice(0, num);
      this.queue = this.queue.slice(num);
      console.log('writing', num);
      this.written += num;

      this.writeQueue.push(...items.map(item => this.recordStream.write(`,"${item}"`)));
    }
    await Promise.delay(50);
    return this.moveQueue();
  }

  async closeQueue() {
    let queueComplete = this.queueStatus;
    this.queueStatus = undefined;
    queueComplete = await queueComplete;
  }

  async close() {
    await this.closeQueue();
    await Promise.all(this.writeQueue);
    await this.recordStream.write(`],"timestamp":${Date.now()}}`);

    if (this.written) {
      copyFileSync(`${this.recordPath}.part`, this.recordPath);
      writeFileSync('tree.json', JSON.stringify(this.recordTree, null, 4));
    }
  }

  /** @param {string} recordId */
  splitRecordId(recordId) {
    return [
      `${recordId}`.slice(0, INDEX_LEN),
      `${recordId}`.slice(INDEX_LEN),
    ]
  }
}