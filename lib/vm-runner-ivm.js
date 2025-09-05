const ivm = require('isolated-vm');
const ScriptHelpers = require('./helpers');
const ScriptLoader = require('./script-loader');

/**
 * VM Runner for executing user scripts in isolated environment (using isolated-vm)
 */
class VMRunnerIvm {
  constructor() {
    this.helpers = new ScriptHelpers();
    this.scriptLoader = new ScriptLoader();
  }

  /**
   * Run user script in isolated-vm with provided credentials (JSON object)
   */
  async runScript(scriptPath, credentials) {
    console.log(`🚀 Starting ivm execution for script: ${scriptPath}`);
    console.log(`📋 Credentials provided: ${Object.keys(credentials).join(', ')}`);

    // Create isolate and context
    const isolate = new ivm.Isolate({ memoryLimit: 64 }); // 64 MB, adjust as needed
    const context = await isolate.createContext();

    // Inject helpers into the context
    await this.injectHelpers(context);

    // Load and execute user script
    await this.loadScript(scriptPath, isolate, context);

    // Execute the run function with credentials
    return await this.executeRunFunction(context, credentials);
  }

  /**
   * Inject helpers into the ivm context's global object
   */
  async injectHelpers(context) {
    const jail = context.global;
    await jail.set('global', jail.derefInto());

    const helpers = this.helpers.getAllHelpers();
    // Expose each helper function as a Reference to the isolate
    for (const [name, value] of Object.entries(helpers)) {
      if (typeof value === 'function') {
        // Wrap the function
        await jail.set(name, new ivm.Reference(async (...args) => {
          try {
            return await value(...args);
          } catch (err) {
            return { error: err.message };
          }
        }));
      } else {
        await jail.set(name, value, { copy: true });
      }
    }
  }

  /**
   * Load and compile user script from various sources
   */
  async loadScript(scriptSource, isolate, context) {
    let userCode;
    try {
      // Read script content using script loader
      userCode = await this.scriptLoader.loadScript(scriptSource);
      console.log(`📄 Loaded user script from: ${this.getSourceDescription(scriptSource)}`);
    } catch (error) {
      throw new Error(`Failed to load user script: ${error.message}`);
    }

    try {
      // In isolated-vm, evaluated scripts must assign the run function to globalThis
      // e.g. globalThis.run = function(credentials) { ... }
      await isolate.compileScript(userCode).then(script => script.run(context));
      console.log('✅ User script compiled and executed successfully');
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
  async executeRunFunction(context, credentials) {
    // Get the run function from the context
    const jail = context.global;
    const runRef = await jail.get('run', { reference: true });

    if (!runRef || typeof runRef.apply !== 'function') {
      throw new Error("User script must export a 'run' function as globalThis.run");
    }

    try {
      console.log("🎯 Calling user script's run function with credentials...");
      // Apply the run function with credentials, with a timeout and result copy
      const result = await runRef.apply(undefined, [credentials], { timeout: 5000, arguments: { copy: true }, result: { copy: true } });
      console.log("✅ User script execution completed successfully");
      return result;
    } catch (error) {
      throw new Error(`User script execution failed: ${error.message}`);
    }
  }
}

module.exports = VMRunnerIvm;
