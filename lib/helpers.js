const axios = require("axios");

/**
 * Helper functions provided to user scripts in the isolated VM
 */
class ScriptHelpers {
  constructor() {
    this.logger = {
      info: (...args) => console.log("[sandbox] ℹ️", ...args),
      error: (...args) => console.error("[sandbox] ❌", ...args),
      warn: (...args) => console.warn("[sandbox] ⚠️", ...args),
      debug: (...args) => console.log("[sandbox] 🐛", ...args),
    };
  }

  /**
   * Make HTTP GET request
   */
  async httpGet(url, opts = {}) {
    try {
      console.log(`📡 GET: ${url}`);
      const res = await axios.get(url, opts);
      return res.data;
    } catch (error) {
      console.error(`❌ GET Error for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Make HTTP POST request
   */
  async httpPost(url, body = {}, opts = {}) {
    try {
      console.log(`📡 POST: ${url}`);
      const res = await axios.post(url, body, opts);
      return res.data;
    } catch (error) {
      console.error(`❌ POST Error for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Base64 encode string
   */
  base64Encode(str) {
    return Buffer.from(str).toString("base64");
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all helper functions as an object
   */
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

module.exports = ScriptHelpers;
