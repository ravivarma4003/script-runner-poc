const vm = require("vm");
const ScriptHelpers = require("./helpers");
const ScriptLoader = require("./script-loader");

/**
 * VM Runner for executing user scripts in isolated environment
 */
class VMRunner {
  constructor() {
    this.helpers = new ScriptHelpers();
    this.scriptLoader = new ScriptLoader();
  }

  /**
   * Run user script in VM with provided credentials (JSON object)
   */
  async runScript(scriptPath, credentials) {
    console.log(`🚀 Starting VM execution for script: ${scriptPath}`);
    console.log(`📋 Credentials provided: ${Object.keys(credentials).join(', ')}`);
    
    // Create sandbox context
    const sandbox = this.createSandbox();
    
    // Load and execute user script
    await this.loadScript(scriptPath, sandbox);
    
    // Execute the run function with credentials
    return await this.executeRunFunction(sandbox, credentials);
  }

  /**
   * Create sandbox context with helpers
   */
  createSandbox() {
    const helpers = this.helpers.getAllHelpers();
    
    return {
      ...helpers,
      // Prevent access to Node.js internals
      require: undefined,
      process: undefined,
      global: undefined,
      Buffer: undefined,
      console: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      clearTimeout: undefined,
      clearInterval: undefined,
    };
  }

  /**
   * Load and compile user script from various sources
   */
  async loadScript(scriptSource, sandbox) {
    let userCode;
    try {
      // Read script content using script loader
      userCode = await this.scriptLoader.loadScript(scriptSource);
      console.log(`📄 Loaded user script from: ${this.getSourceDescription(scriptSource)}`);
    } catch (error) {
      throw new Error(`Failed to load user script: ${error.message}`);
    }

    try {
      const context = vm.createContext(sandbox);
      const script = new vm.Script(userCode);
      script.runInContext(context);
      console.log("✅ User script compiled and executed successfully");
      return context;
    } catch (error) {
      throw new Error(`Failed to compile/run user script: ${error.message}`);
    }
  }

  /**
   * Get human-readable description of script source
   */
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
    if (typeof context.run !== 'function') {
      throw new Error("User script must export a 'run' function");
    }

    try {
      console.log("🎯 Calling user script's run function with credentials...");
      const result = await context.run(credentials);
      console.log("✅ User script execution completed successfully");
      return result;
    } catch (error) {
      throw new Error(`User script execution failed: ${error.message}`);
    }
  }
}

module.exports = VMRunner;
