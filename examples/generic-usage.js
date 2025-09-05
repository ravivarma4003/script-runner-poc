const JamfScriptRunner = require('../index');

/**
 * Example showing generic script execution with dynamic credentials
 */
async function demonstrateGenericUsage() {
  const runner = new JamfScriptRunner();
  
  try {
    console.log("🚀 Demonstrating generic script execution...");
    
    // Example 1: Jamf script with dynamic credentials
    console.log("\n📱 Example 1: Jamf Device Fetcher");
    const jamfCredentials = {
      subdomain: "josyscom",
      username: "PuneetAgarwal", 
      password: "LTd.cwsZD3vbyJBT"
    };
    
    const jamfResult = await runner.run('./scripts/jamf-device-fetcher.js', jamfCredentials);
    
    if (jamfResult.success) {
      console.log(`✅ Jamf script completed: ${jamfResult.metadata.totalDevices} devices`);
    }
    
    // Example 2: Future S3 script (placeholder)
    console.log("\n☁️  Example 2: S3 Script (Future)");
    const s3ScriptSource = {
      type: "s3",
      bucket: "my-scripts-bucket",
      key: "scripts/jamf-fetcher.js"
    };
    
    try {
      // This will fail since S3 is not implemented yet
      await runner.run(s3ScriptSource, jamfCredentials);
    } catch (error) {
      console.log(`⚠️  S3 script execution failed (expected): ${error.message}`);
    }
    
    // Example 3: Database script (placeholder)
    console.log("\n🗄️  Example 3: Database Script (Future)");
    const dbScriptSource = {
      type: "database",
      scriptId: "jamf-fetcher-v1"
    };
    
    try {
      // This will fail since database is not implemented yet
      await runner.run(dbScriptSource, jamfCredentials);
    } catch (error) {
      console.log(`⚠️  Database script execution failed (expected): ${error.message}`);
    }
    
    // Example 4: Show how to handle different credential formats
    console.log("\n🔑 Example 4: Different Credential Formats");
    
    const slackCredentials = {
      webhookUrl: "https://hooks.slack.com/services/...",
      channel: "#general",
      message: "Hello from script!"
    };
    
    const githubCredentials = {
      token: "ghp_xxxxxxxxxxxxxxxxxxxx",
      org: "myorg",
      repo: "myrepo"
    };
    
    console.log("📋 Jamf credentials:", Object.keys(jamfCredentials));
    console.log("📋 Slack credentials:", Object.keys(slackCredentials));
    console.log("📋 GitHub credentials:", Object.keys(githubCredentials));
    
    return {
      jamfResult,
      credentialExamples: {
        jamf: jamfCredentials,
        slack: slackCredentials,
        github: githubCredentials
      }
    };
    
  } catch (error) {
    console.error("❌ Generic usage demonstration failed:", error.message);
    throw error;
  }
}

/**
 * Example showing how to create a custom script for any API
 */
function createCustomScript() {
  return `
/**
 * Custom API Script Template
 * Replace this with your specific API logic
 */

async function run(credentials) {
  // Validate required credentials
  const requiredKeys = ['apiKey', 'baseUrl']; // Customize as needed
  const missingKeys = requiredKeys.filter(key => !credentials[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(\`Missing required credentials: \${missingKeys.join(', ')}\`);
  }

  const { apiKey, baseUrl } = credentials;
  
  logger.info("🚀 Starting custom API script");
  logger.info(\`Base URL: \${baseUrl}\`);

  try {
    // Your custom API logic here
    const response = await httpGet(\`\${baseUrl}/api/endpoint\`, {
      headers: {
        'Authorization': \`Bearer \${apiKey}\`,
        'Content-Type': 'application/json'
      }
    });

    logger.info("✅ API call successful");

    return {
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
      metadata: {
        baseUrl,
        endpoint: '/api/endpoint',
        fetchedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error("❌ Custom script execution failed:", error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
`;
}

// Run demonstration if called directly
if (require.main === module) {
  demonstrateGenericUsage()
    .then(result => {
      console.log("\n🎉 Generic usage demonstration completed!");
      console.log("📊 Jamf result:", result.jamfResult.success ? "Success" : "Failed");
      console.log("🔑 Credential examples available for:", Object.keys(result.credentialExamples));
    })
    .catch(error => {
      console.error("💥 Demonstration failed:", error.message);
      process.exit(1);
    });
}

module.exports = { demonstrateGenericUsage, createCustomScript };
