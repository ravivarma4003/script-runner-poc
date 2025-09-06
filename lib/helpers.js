const axios = require("axios");

/**
 * Helper functions provided to user scripts in the isolated VM
 * Refactored to work with both regular VM and isolated-vm
 */

/**
 * Make HTTP GET request
 */
async function httpGet(url, opts = {}) {
  try {
    console.log(`📡 GET: ${url}`);
    const res = await axios.get(url, opts);
    return res.data;
  } catch (error) {
    console.error(`❌ GET Error for ${url}:`, error.message);
    throw new Error(error.message);
  }
}

/**
 * Make HTTP POST request
 */
async function httpPost(url, body = {}, opts = {}) {
  try {
    console.log(`📡 POST: ${url}`);
    const res = await axios.post(url, body, opts);
    return res.data;
  } catch (error) {
    console.error(`❌ POST Error for ${url}:`, error.message);
    throw new Error(error.message);
  }
}

/**
 * Base64 encode string
 */
function base64Encode(str) {
  return Buffer.from(str).toString("base64");
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Logger functions
 */
const logger = {
  info: (...args) => console.log("[sandbox] ℹ️", ...args),
  error: (...args) => console.error("[sandbox] ❌", ...args),
  warn: (...args) => console.warn("[sandbox] ⚠️", ...args),
  debug: (...args) => console.log("[sandbox] 🐛", ...args),
};

/**
 * Legacy class for backward compatibility with regular VM
 */
class ScriptHelpers {
  constructor() {
    this.logger = logger;
  }

  async httpGet(url, opts = {}) {
    return httpGet(url, opts);
  }

  async httpPost(url, body = {}, opts = {}) {
    return httpPost(url, body, opts);
  }

  base64Encode(str) {
    return base64Encode(str);
  }

  sleep(ms) {
    return sleep(ms);
  }

  getAllHelpers() {
    return {
      httpGet: this.httpGet.bind(this),
      httpPost: this.httpPost.bind(this),
      logger: this.logger,
      base64Encode: this.base64Encode.bind(this),
      sleep: this.sleep.bind(this),
    };
  }
}

// Export both individual functions and the class
module.exports = ScriptHelpers;
module.exports.httpGet = httpGet;
module.exports.httpPost = httpPost;
module.exports.base64Encode = base64Encode;
module.exports.sleep = sleep;
module.exports.logger = logger;
