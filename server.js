#!/usr/bin/env node

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const ScriptRunner = require('./index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads to scripts folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './scripts/');
  },
  filename: function (req, file, cb) {
    // Keep original filename or use custom name from request
    const filename = req.body.filename || file.originalname;
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow .js files
    if (path.extname(file.originalname) === '.js') {
      cb(null, true);
    } else {
      cb(new Error('Only .js files are allowed!'), false);
    }
  }
});

// Initialize script runner
const scriptRunner = new ScriptRunner();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'script-runner-api'
  });
});

// Get list of available scripts
app.get('/scripts', async (req, res) => {
  try {
    const files = await fs.readdir('./scripts');
    const jsFiles = files.filter(file => path.extname(file) === '.js');
    
    const scripts = await Promise.all(
      jsFiles.map(async (file) => {
        const filePath = path.join('./scripts', file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          path: `./scripts/${file}`,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      })
    );
    
    res.json({
      success: true,
      scripts: scripts,
      count: scripts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list scripts',
      message: error.message
    });
  }
});

// Upload script endpoint
app.post('/scripts/upload', upload.single('script'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No script file provided'
      });
    }

    const scriptInfo = {
      name: req.file.filename,
      originalName: req.file.originalname,
      path: `./scripts/${req.file.filename}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Script uploaded successfully',
      script: scriptInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to upload script',
      message: error.message
    });
  }
});

// Execute script endpoint
app.post('/scripts/execute', async (req, res) => {
  try {
    const { scriptPath, credentials, scriptName } = req.body;

    // Validate required fields
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: 'Credentials are required'
      });
    }

    // Determine script path
    let finalScriptPath;
    if (scriptPath) {
      finalScriptPath = scriptPath;
    } else if (scriptName) {
      finalScriptPath = `./scripts/${scriptName}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either scriptPath or scriptName is required'
      });
    }

    // Check if script exists
    try {
      await fs.access(finalScriptPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'Script not found',
        scriptPath: finalScriptPath
      });
    }

    // Execute the script
    console.log(`🚀 Executing script: ${finalScriptPath}`);
    console.log(`📋 Credentials provided for: ${Object.keys(credentials).join(', ')}`);
    
    const result = await scriptRunner.run(finalScriptPath, credentials);

    res.json({
      success: true,
      message: 'Script executed successfully',
      scriptPath: finalScriptPath,
      result: result,
      executedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Script execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Script execution failed',
      message: error.message,
      executedAt: new Date().toISOString()
    });
  }
});

// Get script content endpoint
app.get('/scripts/:scriptName', async (req, res) => {
  try {
    const { scriptName } = req.params;
    const scriptPath = `./scripts/${scriptName}`;
    
    const content = await fs.readFile(scriptPath, 'utf8');
    const stats = await fs.stat(scriptPath);
    
    res.json({
      success: true,
      script: {
        name: scriptName,
        path: scriptPath,
        content: content,
        size: stats.size,
        modified: stats.mtime.toISOString()
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: 'Script not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to read script',
        message: error.message
      });
    }
  }
});

// Delete script endpoint
app.delete('/scripts/:scriptName', async (req, res) => {
  try {
    const { scriptName } = req.params;
    const scriptPath = `./scripts/${scriptName}`;
    
    await fs.unlink(scriptPath);
    
    res.json({
      success: true,
      message: 'Script deleted successfully',
      scriptName: scriptName
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({
        success: false,
        error: 'Script not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete script',
        message: error.message
      });
    }
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /scripts',
      'POST /scripts/upload',
      'POST /scripts/execute',
      'GET /scripts/:scriptName',
      'DELETE /scripts/:scriptName'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Script Runner API Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health                 - Health check`);
  console.log(`   GET  /scripts                - List all scripts`);
  console.log(`   POST /scripts/upload         - Upload a script file`);
  console.log(`   POST /scripts/execute        - Execute a script with credentials`);
  console.log(`   GET  /scripts/:scriptName    - Get script content`);
  console.log(`   DELETE /scripts/:scriptName  - Delete a script`);
  console.log(`\n💡 Example usage:`);
  console.log(`   curl -X POST http://localhost:${PORT}/scripts/execute \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"scriptName":"jamf-device-fetcher.js","credentials":{"subdomain":"josyscom","username":"PuneetAgarwal","password":"LTd.cwsZD3vbyJBA"}}'`);
});

module.exports = app;
