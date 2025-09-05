#!/usr/bin/env node

const VMRunner = require('./lib/vm-runner');
const path = require('path');

/**
 * Main entry point for running user scripts in isolated VM
 */
class ScriptRunner {
  constructor() {
    this.vmRunner = new VMRunner();
  }

  /**
   * Run a script with credentials (JSON object)
   * @param {string|object} scriptSource - File path or script source object
   * @param {object} credentials - Credentials JSON object
   */
  async run(scriptSource, credentials) {
    try {
      const result = await this.vmRunner.runScript(scriptSource, credentials);
      return result;
    } catch (error) {
      console.error("💥 Execution failed:", error.message);
      throw error;
    }
  }

  /**
   * CLI interface - supports both old format and new JSON format
   */
  async cli() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      this.showUsage();
      return;
    }

    const [scriptSourceArg, credentialsArg] = args;
    const scriptSource = scriptSourceArg || './scripts/jamf-device-fetcher.js';

    let credentials;
    
    // Try to parse credentials as JSON first
    try {
      credentials = JSON.parse(credentialsArg);
    } catch (error) {
      // Fallback to old format for backward compatibility
      if (args.length >= 4) {
        const [subdomain, username, password] = args.slice(1);
        credentials = { subdomain, username, password };
        console.log("⚠️  Using legacy format. Consider using JSON format for better flexibility.");
      } else {
        console.log("❌ Invalid credentials format. Use JSON format or legacy format.");
        this.showUsage();
        return;
      }
    }

    try {
      const result = await this.run(scriptSource, credentials);
      
      if (result.success) {
        console.log("✅ Script executed successfully!");
        console.log(`🕒 Executed at: ${result.timestamp}`);
        
        // Show generic result information
        console.log("\n💡 Script result:");
        if (result.data) {
          console.log("   const data = result.data; // Script returned data");
        }
        if (result.metadata) {
          console.log("   const metadata = result.metadata; // Additional metadata");
        }
        
        // Show sample data if available
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          console.log("\n📊 Sample data:");
          console.log(JSON.stringify(result.data.slice(0, 2), null, 2));
        } else if (result.data) {
          console.log("\n📊 Result data:");
          console.log(JSON.stringify(result.data, null, 2));
        }
      } else {
        console.error("❌ Script failed:", result.error);
        process.exit(1);
      }
    } catch (error) {
      process.exit(1);
    }
  }

  /**
   * Show usage information
   */
  showUsage() {
    console.log(`
Usage: node index.js <script-source> <credentials-json>

Script Sources:
  # File path (current)
  ./scripts/jamf-device-fetcher.js
  
  # S3 source (future)
  '{"type":"s3","bucket":"my-bucket","key":"scripts/jamf-fetcher.js"}'
  
  # Database source (future)
  '{"type":"database","scriptId":"jamf-fetcher-v1"}'

Examples:
  # File with JSON credentials
  node index.js ./scripts/jamf-device-fetcher.js '{"subdomain":"josyscom","username":"admin","password":"mypassword"}'
  
  # S3 script with credentials
  node index.js '{"type":"s3","bucket":"scripts","key":"jamf-fetcher.js"}' '{"subdomain":"company","username":"admin","password":"pass"}'
  
  # Legacy format (backward compatibility)
  node index.js josyscom admin mypassword ./scripts/jamf-device-fetcher.js

Available scripts:
  ./scripts/jamf-device-fetcher.js    - Fetch all devices
  ./scripts/jamf-device-analyzer.js   - Analyze device data

Credential format examples:
  Jamf: {"subdomain":"company","username":"admin","password":"pass"}
  Slack: {"webhookUrl":"https://hooks.slack.com/...","channel":"#general"}
  GitHub: {"token":"ghp_...","org":"myorg"}
    `);
  }
}

// Export for programmatic use
module.exports = ScriptRunner;

// CLI interface
if (require.main === module) {
  const runner = new ScriptRunner();
  runner.cli();
}