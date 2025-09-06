const ivm = require('isolated-vm');
const ScriptLoader = require('./script-loader');
const { httpGet, httpPost, base64Encode, sleep, logger } = require('./helpers');

/**
 * VM Runner for executing user scripts in isolated environment (using isolated-vm)
 */
class VMRunnerIvm {
  constructor(options = {}) {
    this.scriptLoader = new ScriptLoader();
    // Configurable timeout (default 5 minutes for long-running operations)
    this.executionTimeout = options.executionTimeout || 300000; // 5 minutes
    this.memoryLimit = options.memoryLimit || 128; // MB
  }

  /**
   * Run user script in isolated-vm with provided credentials (JSON object)
   */
  async runScript(scriptPath, credentials) {
    // Generate unique execution ID for parallel safety
    const executionId = Math.random().toString(36).substr(2, 9);
    
    console.log(`🚀 [${executionId}] Starting ivm execution for script: ${scriptPath}`);
    console.log(`📋 [${executionId}] Credentials provided: ${Object.keys(credentials).join(', ')}`);
    console.log(`⏱️  [${executionId}] Execution timeout: ${this.executionTimeout}ms`);

    // Create isolate and context with configurable memory limit
    const isolate = new ivm.Isolate({ memoryLimit: this.memoryLimit });
    const context = isolate.createContextSync();
    const jail = context.global;

    // Set global object (like the official example)
    jail.setSync('global', jail.derefInto());

    // Inject helpers into the context with execution ID (using async version to avoid deadlocks)
    await this.injectHelpers(jail, context, executionId);

    // Load and execute user script
    await this.loadScript(scriptPath, isolate, context, executionId);

    // Execute the run function with credentials
    return await this.executeRunFunction(context, credentials, executionId);
  }

  /**
   * Inject helpers into the ivm context's global object (async version to avoid deadlocks)
   */
  async injectHelpers(jail, context, executionId = 'unknown') {
    // Create References using imported helper functions directly
    jail.setSync('_httpGet', new ivm.Reference(httpGet));
    jail.setSync('_httpPost', new ivm.Reference(httpPost));
    jail.setSync('_base64Encode', new ivm.Reference(base64Encode));
    jail.setSync('_sleep', new ivm.Reference(sleep));

    // Create logger References using imported logger functions with execution ID
    jail.setSync('_logInfo', new ivm.Reference((...args) => {
      // Modify the logger output to include execution ID
      const originalLog = console.log;
      console.log = (...logArgs) => originalLog(`[sandbox-${executionId}]`, ...logArgs);
      logger.info(...args);
      console.log = originalLog; // Restore original
    }));
    jail.setSync('_logError', new ivm.Reference((...args) => {
      const originalError = console.error;
      console.error = (...logArgs) => originalError(`[sandbox-${executionId}]`, ...logArgs);
      logger.error(...args);
      console.error = originalError;
    }));
    jail.setSync('_logWarn', new ivm.Reference((...args) => {
      const originalWarn = console.warn;
      console.warn = (...logArgs) => originalWarn(`[sandbox-${executionId}]`, ...logArgs);
      logger.warn(...args);
      console.warn = originalWarn;
    }));
    jail.setSync('_logDebug', new ivm.Reference((...args) => {
      const originalLog = console.log;
      console.log = (...logArgs) => originalLog(`[sandbox-${executionId}]`, ...logArgs);
      logger.debug(...args);
      console.log = originalLog;
    }));

    // Create wrapper functions and logger object using async eval to avoid deadlocks
    await context.eval(`
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

      // Create logger object using imported logger functions
      globalThis.logger = {
        info: function(...args) { 
          _logInfo.apply(null, args, { arguments: { copy: true } }); 
        },
        error: function(...args) { 
          _logError.apply(null, args, { arguments: { copy: true } }); 
        },
        warn: function(...args) { 
          _logWarn.apply(null, args, { arguments: { copy: true } }); 
        },
        debug: function(...args) { 
          _logDebug.apply(null, args, { arguments: { copy: true } }); 
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
        timeout: this.executionTimeout, // Use configurable timeout
        arguments: { copy: true },
        result: { copy: true, promise: true }
      });
      
      console.log(`✅ [${executionId}] User script execution completed successfully`);
      return result;
    } catch (error) {
      throw new Error(`User script execution failed: ${error.message}`);
    }
  }

}

module.exports = VMRunnerIvm;
