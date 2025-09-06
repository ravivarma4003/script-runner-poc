# Script Runner POC

A generic, modular system for running user-uploaded scripts in an isolated VM environment for any API interactions. The uploaded scripts are fully self-contained and handle all API operations including authentication and data fetching using dynamic JSON credentials.

## 🏗️ Architecture

```
script-runner-poc/
├── lib/                    # Core library modules
│   ├── helpers.js         # Helper functions for user scripts
│   ├── script-loader.js   # Multi-source script loading (file, S3, database)
│   ├── vm-runner.js       # Legacy VM execution engine
│   └── vm-runner-ivm.js   # Isolated-VM execution engine (current)
├── scripts/               # User-uploaded scripts
│   ├── jamf-device-fetcher.js    # Fetch all devices from Jamf
│   └── jamf-device-analyzer.js   # Analyze device data
├── examples/              # Usage examples
│   ├── basic-usage.js     # Basic usage example
│   ├── generic-usage.js   # Generic API usage patterns
│   ├── device-data-usage.js      # How to use returned data
│   └── reuse-device-data.js      # Reusing data for multiple purposes
├── index.js               # Main entry point with CLI interface
└── package.json
```

## ✨ Features

- ✅ **Generic API Support**: Works with any API using dynamic JSON credentials
- ✅ **Isolated Execution**: User scripts run in sandboxed isolated-vm environment
- ✅ **Multi-source Script Loading**: Load scripts from files, S3, database, or inline
- ✅ **JSON Credential System**: Flexible credential format for any API
- ✅ **Backward Compatibility**: Supports legacy credential format
- ✅ **Configurable Execution**: Timeout and memory limits
- ✅ **Parallel Execution Safety**: Unique execution IDs for concurrent runs
- ✅ **Helper Functions**: HTTP requests, logging, and utilities
- ✅ **Raw Data Return**: Get complete API data for reuse in main logic
- ✅ **CLI & Programmatic**: Use via command line or as a library

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Basic Usage (New JSON Format)
```bash
# Using JSON credentials (recommended)
node index.js ./scripts/jamf-device-fetcher.js '{"subdomain":"company","username":"admin","password":"mypass"}'

# Using S3 script source (future)
node index.js '{"type":"s3","bucket":"scripts","key":"jamf-fetcher.js"}' '{"subdomain":"company","username":"admin","password":"pass"}'
```

### Legacy Format (Backward Compatibility)
```bash
# Legacy format still supported
node index.js company admin mypass ./scripts/jamf-device-fetcher.js
```

### Programmatic Usage
```javascript
const ScriptRunner = require('./index');

const runner = new ScriptRunner();

// JSON credentials (recommended)
const credentials = {
  subdomain: "company",
  username: "admin", 
  password: "mypass"
};

const result = await runner.run('./scripts/jamf-device-fetcher.js', credentials);

// Use the returned data in your main logic
if (result.success) {
  const devices = result.data; // Raw device data from API
  const metadata = result.metadata; // Additional metadata
}
```

## 🔧 Script Sources

### File System (Current)
```javascript
const result = await runner.run('./scripts/jamf-device-fetcher.js', credentials);
```

### S3 (Future Implementation)
```javascript
const s3Source = {
  type: "s3",
  bucket: "my-scripts-bucket",
  key: "scripts/jamf-fetcher.js"
};
const result = await runner.run(s3Source, credentials);
```

### Database (Future Implementation)
```javascript
const dbSource = {
  type: "database",
  scriptId: "jamf-fetcher-v1"
};
const result = await runner.run(dbSource, credentials);
```

### Inline Code
```javascript
const inlineSource = {
  type: "inline",
  code: `
    async function run(credentials) {
      // Your script logic here
      return { success: true, data: "result" };
    }
  `
};
const result = await runner.run(inlineSource, credentials);
```

## 🔑 Credential Formats

### Jamf API
```json
{
  "subdomain": "company",
  "username": "admin",
  "password": "mypassword"
}
```

### Slack API
```json
{
  "webhookUrl": "https://hooks.slack.com/services/...",
  "channel": "#general"
}
```

### GitHub API
```json
{
  "token": "ghp_xxxxxxxxxxxxxxxxxxxx",
  "org": "myorg",
  "repo": "myrepo"
}
```

### Generic API
```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://api.example.com",
  "customHeader": "value"
}
```

## 📊 Response Format

All scripts return a standardized response format:

```javascript
{
  success: true,
  data: [...], // Raw API data
  timestamp: "2025-01-06T13:27:48.906Z",
  metadata: {
    // Script-specific metadata
    subdomain: "company",
    totalDevices: 166,
    fetchedAt: "2025-01-06T13:27:48.906Z",
    apiEndpoint: "https://company.jamfcloud.com/api/v1/computers-inventory"
  }
}
```

## 📁 Available Scripts

### `jamf-device-fetcher.js`
- Fetches all devices from Jamf with pagination
- Returns raw device data for reuse
- Handles authentication automatically
- **Credentials**: `subdomain`, `username`, `password`

### `jamf-device-analyzer.js`
- Analyzes device data and provides insights
- Generates compliance reports
- Identifies devices needing attention
- **Credentials**: `subdomain`, `username`, `password`

## 🔧 Creating Custom Scripts

Create new scripts following this pattern:

```javascript
// scripts/my-custom-script.js

/**
 * Custom API Script
 * 
 * Required credentials:
 * - apiKey: Your API key
 * - baseUrl: API base URL
 */

async function run(credentials) {
  // Validate required credentials
  const requiredKeys = ['apiKey', 'baseUrl'];
  const missingKeys = requiredKeys.filter(key => !credentials[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required credentials: ${missingKeys.join(', ')}`);
  }

  const { apiKey, baseUrl } = credentials;
  
  logger.info("🚀 Starting custom API script");

  try {
    // Your API logic here
    const response = await httpGet(`${baseUrl}/api/endpoint`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

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
    logger.error("❌ Script execution failed:", error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}
```

## 🛠️ Available Helpers

User scripts have access to these helper functions:

- `httpGet(url, options)` - Make GET requests
- `httpPost(url, body, options)` - Make POST requests
- `logger.info/error/warn/debug(...)` - Logging functions with execution ID
- `base64Encode(str)` - Base64 encoding utility
- `sleep(ms)` - Async sleep function

## 📚 Examples

### Basic Usage
```bash
node examples/basic-usage.js
```

### Generic API Usage
```bash
node examples/generic-usage.js
```

### Device Data Usage
```bash
node examples/device-data-usage.js
```

### Reusing Device Data
```bash
node examples/reuse-device-data.js
```

## ⚙️ Configuration

### VM Configuration
```javascript
const runner = new ScriptRunner({
  executionTimeout: 300000, // 5 minutes (default)
  memoryLimit: 128 // MB (default)
});
```

### CLI Usage Help
```bash
node index.js --help
# Shows detailed usage information and examples
```

## 🔒 Security Features

- **Isolated-VM Sandboxing**: Scripts run in completely isolated environment
- **No File System Access**: Scripts cannot read/write files directly
- **Controlled Network**: Only HTTP requests through provided helpers
- **No Node.js Internals**: Limited access to Node.js APIs
- **Memory Limits**: Configurable memory constraints
- **Execution Timeouts**: Configurable execution time limits
- **Parallel Safety**: Unique execution IDs prevent interference

## 🎯 Use Cases

1. **Multi-API Integration**: Connect to any REST API with dynamic credentials
2. **Device Management**: Jamf, Intune, or other MDM systems
3. **Cloud Services**: AWS, Azure, GCP API interactions
4. **Communication**: Slack, Teams, email notifications
5. **Data Processing**: Transform and analyze API responses
6. **Automation**: Scheduled API operations
7. **Reporting**: Generate reports from multiple data sources
8. **Monitoring**: Health checks and status monitoring

## 📝 NPM Scripts

```bash
npm start                    # Run with CLI
npm run example             # Run basic usage example
```

## 🚀 Future Enhancements

- ✅ **Isolated-VM Implementation**: Complete (current)
- 🔄 **S3 Script Loading**: In progress
- 📋 **Database Script Storage**: Planned
- 🌐 **URL Script Loading**: Planned
- 📊 **Script Versioning**: Planned
- 🔐 **Credential Encryption**: Planned

## 🤝 Contributing

1. Add new scripts to `scripts/` folder
2. Follow the standard `run(credentials)` function pattern
3. Use provided helpers for API calls
4. Return structured data with success/error handling
5. Include credential validation
6. Add logging for debugging

## 📄 License

ISC

## 🔗 Dependencies

- **isolated-vm**: ^5.0.3 - Secure script execution
- **axios**: ^1.11.0 - HTTP client for API calls
- **Node.js**: >=14.0.0 - Runtime requirement
