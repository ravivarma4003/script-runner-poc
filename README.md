# Script Runner POC

A clean, modular system for running user-uploaded scripts in an isolated VM environment for any API interactions. The uploaded scripts are fully self-contained and handle all API operations including authentication and data fetching.

## 🏗️ Architecture

```
script-runner-poc/
├── lib/                    # Core library modules
│   ├── helpers.js         # Helper functions for user scripts
│   └── vm-runner.js       # VM execution engine
├── scripts/               # User-uploaded scripts
│   ├── jamf-device-fetcher.js    # Fetch all devices
│   └── jamf-device-analyzer.js   # Analyze device data
├── examples/              # Usage examples
│   ├── basic-usage.js     # Basic usage example
│   ├── device-data-usage.js      # How to use returned data
│   └── reuse-device-data.js      # Reusing data for multiple purposes
├── index.js               # Main entry point
└── package.json
```

## ✨ Features

- ✅ **Clean Modular Design**: Separated concerns with dedicated modules
- ✅ **Isolated Execution**: User scripts run in sandboxed VM environment
- ✅ **Self-contained Scripts**: All Jamf API logic in user scripts
- ✅ **Raw Data Return**: Get complete device data for reuse in main logic
- ✅ **Helper Functions**: HTTP requests, logging, and utilities
- ✅ **Multiple Scripts**: Easy to add new user scripts
- ✅ **Reusable Data**: Use fetched data for multiple purposes

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Basic Usage
```bash
# Fetch all devices
node index.js josyscom username password

# Use specific script
node index.js josyscom username password ./scripts/jamf-device-analyzer.js
```

### Programmatic Usage
```javascript
const ScriptRunner = require('./index');

const runner = new ScriptRunner();
const result = await runner.run(
  './scripts/jamf-device-fetcher.js',
  'josyscom',
  'username',
  'password'
);

// Use the device data in your main logic
const devices = result.devices; // Raw device data from Jamf API
const metadata = result.metadata; // Additional metadata
```

## 📊 Using Returned Device Data

The scripts return raw device data that you can use in your main logic:

```javascript
const result = await runner.run('./scripts/jamf-device-fetcher.js', subdomain, username, password);

if (result.success) {
  const devices = result.devices; // Complete device data from Jamf API
  
  // Use for multiple purposes:
  // 1. Generate reports
  // 2. Filter devices
  // 3. Export to different formats
  // 4. Save to database
  // 5. Send notifications
}
```

### Response Format
```javascript
{
  success: true,
  totalDevices: 166,
  devices: [...], // Raw device data from Jamf API
  timestamp: "2025-09-05T11:29:19.906Z",
  metadata: {
    subdomain: "josyscom",
    fetchedAt: "2025-09-05T11:29:19.906Z",
    apiEndpoint: "https://josyscom.jamfcloud.com/api/v1/computers-inventory"
  }
}
```

## 📁 Available Scripts

### `jamf-device-fetcher.js`
- Fetches all devices with pagination
- Returns raw device data for reuse
- Handles authentication automatically

### `jamf-device-analyzer.js`
- Analyzes device data and provides insights
- Generates compliance reports
- Identifies devices needing attention

## 🔧 Creating Custom Scripts

Create new scripts in the `scripts/` folder:

```javascript
// scripts/my-custom-script.js
async function run(subdomain, username, password) {
  // Your custom logic here
  // Use provided helpers: httpGet, httpPost, logger, etc.
  
  return {
    success: true,
    data: yourResults,
    timestamp: new Date().toISOString()
  };
}
```

## 🛠️ Available Helpers

User scripts have access to these helper functions:

- `httpGet(url, options)` - Make GET requests
- `httpPost(url, body, options)` - Make POST requests
- `logger.info/error/warn/debug(...)` - Logging functions
- `base64Encode(str)` - Base64 encoding utility
- `sleep(ms)` - Async sleep function

## 📚 Examples

### Basic Usage
```bash
node examples/basic-usage.js
```

### Device Data Usage
```bash
node examples/device-data-usage.js
```

### Reusing Device Data
```bash
node examples/reuse-device-data.js
```

## 🔒 Security Features

- **VM Sandboxing**: Scripts run in isolated Node.js VM
- **No File System Access**: Scripts cannot read/write files directly
- **Controlled Network**: Only HTTP requests through provided helpers
- **No Node.js Internals**: Limited access to Node.js APIs

## 🎯 Use Cases

1. **Device Inventory**: Fetch and analyze all devices
2. **Compliance Reporting**: Generate compliance reports
3. **Device Management**: Identify devices needing attention
4. **Data Export**: Export device data to various formats
5. **Automation**: Automate Jamf operations
6. **Integration**: Integrate Jamf data with other systems

## 📝 Scripts

```bash
npm start                    # Run with CLI
npm run example             # Run basic usage example
```

## 🤝 Contributing

1. Add new scripts to `scripts/` folder
2. Follow the existing pattern with `run()` function
3. Use provided helpers for API calls
4. Return structured data for reuse

## 📄 License

ISC