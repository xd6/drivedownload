import { writeFileSync } from "fs";

export default class Exception extends Error {
  constructor(msg, e) {
    writeFileSync('error_log.json', JSON.stringify(
      `{${Object.getOwnPropertyNames(e).map(k => `"${k}": "${e[k]}"`).join(',')}}`,
      null,
      4)
      .replace(/^"|"$/g, '')
      .replace(/\\"/g, '"')
    );
    throw new Error(msg);
  }
}