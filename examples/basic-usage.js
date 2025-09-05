const JamfScriptRunner = require('../index');

async function example() {
  const runner = new JamfScriptRunner();
  
  try {
    // Run device fetcher script
    console.log("🔍 Running device fetcher...");
    const devices = await runner.run(
      './scripts/jamf-device-fetcher.js',
      'josyscom',
      'PuneetAgarwal',
      'LTd.cwsZD3vbyJBT'
    );
    
    console.log(`✅ Fetched ${devices.totalDevices} devices`);
    
    // Run device analyzer script
    console.log("\n📊 Running device analyzer...");
    const analysis = await runner.run(
      './scripts/jamf-device-analyzer.js',
      'josyscom',
      'PuneetAgarwal',
      'LTd.cwsZD3vbyJBT'
    );
    
    console.log("✅ Analysis complete:", analysis.analysis.summary);
    
  } catch (error) {
    console.error("❌ Example failed:", error.message);
  }
}

// Run example if called directly
if (require.main === module) {
  example();
}

module.exports = { example };
