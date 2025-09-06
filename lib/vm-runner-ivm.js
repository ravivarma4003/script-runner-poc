const ivm = require('isolated-vm');
const ScriptLoader = require('./script-loader');
const axios = require('axios');
const Buffer = require('buffer').Buffer;

/**
 * VM Runner for executing user scripts in isolated environment (using isolated-vm)
 */
class VMRunnerIvm {
  constructor() {
    this.scriptLoader = new ScriptLoader();
  }

  /**
   * Run user script in isolated-vm with provided credentials (JSON object)
   */
  async runScript(scriptPath, credentials) {
    // Generate unique execution ID for parallel safety
    const executionId = Math.random().toString(36).substr(2, 9);
    
    console.log(`🚀 [${executionId}] Starting ivm execution for script: ${scriptPath}`);
    console.log(`📋 [${executionId}] Credentials provided: ${Object.keys(credentials).join(', ')}`);

    // Create isolate and context (using sync methods like the official example)
    const isolate = new ivm.Isolate({ memoryLimit: 128 }); // 128 MB like the example
    const context = isolate.createContextSync();
    const jail = context.global;

    // Set global object (like the official example)
    jail.setSync('global', jail.derefInto());

    // Inject helpers into the context with execution ID
    this.injectHelpersSync(jail, context, executionId);

    // Load and execute user script
    await this.loadScript(scriptPath, isolate, context, executionId);

    // Execute the run function with credentials
    return await this.executeRunFunction(context, credentials, executionId);
  }

  /**
   * Inject helpers into the ivm context's global object (sync version)
   */
  injectHelpersSync(jail, context, executionId = 'unknown') {
    // Simple logging function with execution ID for parallel safety
    jail.setSync('_log', new ivm.Reference((...args) => {
      console.log(`[sandbox-${executionId}]`, ...args);
    }));

    // Create References using helper methods for consistency
    jail.setSync('_httpGet', new ivm.Reference(this.createHttpGetReference()));
    jail.setSync('_httpPost', new ivm.Reference(this.createHttpPostReference()));
    jail.setSync('_base64Encode', new ivm.Reference(this.createBase64EncodeReference()));
    jail.setSync('_sleep', new ivm.Reference(this.createSleepReference()));

    // Create wrapper functions and logger object using eval inside the isolate
    context.evalSync(`
      // Create wrapper functions for HTTP and utility functions
      globalThis.httpGet = async function(url, opts) {
        return await _httpGet.apply(null, [url, opts], { 
          arguments: { copy: true }, 
          result: { copy: true, promise: true } 
        });
      };
      
      globalThis.httpPost = async function(url, body, opts) {
        return await _httpPost.apply(null, [url, body, opts], { 
          arguments: { copy: true }, 
          result: { copy: true, promise: true } 
        });
      };
      
      globalThis.base64Encode = function(str) {
        return _base64Encode.applySync(null, [str], { 
          arguments: { copy: true }, 
          result: { copy: true } 
        });
      };
      
      globalThis.sleep = async function(ms) {
        return await _sleep.apply(null, [ms], { 
          arguments: { copy: true }, 
          result: { copy: true, promise: true } 
        });
      };

      // Create logger object
      globalThis.logger = {
        info: function(...args) { 
          _log.apply(null, ['ℹ️', ...args], { arguments: { copy: true } }); 
        },
        error: function(...args) { 
          _log.apply(null, ['❌', ...args], { arguments: { copy: true } }); 
        },
        warn: function(...args) { 
          _log.apply(null, ['⚠️', ...args], { arguments: { copy: true } }); 
        },
        debug: function(...args) { 
          _log.apply(null, ['🐛', ...args], { arguments: { copy: true } }); 
        }
      };
    `);
  }


  /**
   * Load and compile user script from various sources
   */
  async loadScript(scriptSource, isolate, context, executionId = 'unknown') {
    let userCode;
    try {
      // Read script content using script loader
      userCode = await this.scriptLoader.loadScript(scriptSource);
      console.log(`📄 [${executionId}] Loaded user script from: ${this.getSourceDescription(scriptSource)}`);
    } catch (error) {
      throw new Error(`Failed to load user script: ${error.message}`);
    }

    try {
      // Use sync methods like the official example
      const script = isolate.compileScriptSync(userCode);
      script.runSync(context);
      console.log(`✅ [${executionId}] User script compiled and executed successfully`);
    } catch (error) {
      throw new Error(`Failed to compile/run user script: ${error.message}`);
    }
  }

  getSourceDescription(scriptSource) {
    if (typeof scriptSource === 'string') {
      return `file: ${scriptSource}`;
    }
    if (scriptSource.type === 's3') {
      return `S3: s3://${scriptSource.bucket}/${scriptSource.key}`;
    }
    if (scriptSource.type === 'database') {
      return `database: ${scriptSource.scriptId}`;
    }
    if (scriptSource.type === 'url') {
      return `URL: ${scriptSource.url}`;
    }
    return JSON.stringify(scriptSource);
  }

  /**
   * Execute the run function from user script with credentials
   */
  async executeRunFunction(context, credentials, executionId = 'unknown') {
    try {
      console.log(`🎯 [${executionId}] Calling user script's run function with credentials...`);
      
      // Check if run function exists
      const runExists = context.evalSync('typeof globalThis.run === "function"');
      if (!runExists) {
        throw new Error("User script must export a 'run' function as globalThis.run");
      }
      
      // Get the run function reference and call it with proper options
      const jail = context.global;
      const runRef = jail.getSync('run', { reference: true });
      
      // Create a serializable copy of credentials to ensure they can be transferred
      const credentialsCopy = JSON.parse(JSON.stringify(credentials));
      
      const result = await runRef.apply(undefined, [credentialsCopy], {
        timeout: 30000,
        arguments: { copy: true },
        result: { copy: true, promise: true }
      });
      
      console.log(`✅ [${executionId}] User script execution completed successfully`);
      return result;
    } catch (error) {
      throw new Error(`User script execution failed: ${error.message}`);
    }
  }

  /**
   * Factory methods to create Reference functions (reduces duplication)
   */
  createHttpGetReference() {
    return async (url, opts = {}) => {
      try {
        console.log(`📡 GET: ${url}`);
        const res = await axios.get(url, opts);
        return res.data;
      } catch (error) {
        console.error(`❌ GET Error for ${url}:`, error.message);
        throw new Error(error.message);
      }
    };
  }

  createHttpPostReference() {
    return async (url, body = {}, opts = {}) => {
      try {
        console.log(`📡 POST: ${url}`);
        const res = await axios.post(url, body, opts);
        return res.data;
      } catch (error) {
        console.error(`❌ POST Error for ${url}:`, error.message);
        throw new Error(error.message);
      }
    };
  }

  createBase64EncodeReference() {
    return (str) => {
      return Buffer.from(str).toString("base64");
    };
  }

  createSleepReference() {
    return (ms) => {
      return new Promise(resolve => setTimeout(resolve, ms));
    };
  }
}

module.exports = VMRunnerIvm;
