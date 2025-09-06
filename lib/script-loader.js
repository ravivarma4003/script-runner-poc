const fs = require("fs");
const { Readable } = require("stream");

/**
 * Script Loader - handles loading scripts from different sources
 * Currently supports file system, can be extended for S3, database, etc.
 */
class ScriptLoader {
  constructor() {
    this.sources = {
      file: this.loadFromFile.bind(this),
      inline: this.loadFromInline.bind(this),
      s3: this.loadFromS3.bind(this),
      // Future sources can be added here
      // database: this.loadFromDatabase.bind(this),
      // url: this.loadFromUrl.bind(this)
    };
  }

  /**
   * Load script content from various sources
   * @param {string|object} source - File path string or source object
   * @returns {Promise<string>} Script content
   */
  async loadScript(source) {
    if (typeof source === 'string') {
      // Default to file system
      return await this.loadFromFile(source);
    }

    if (typeof source === 'object' && source.type) {
      const loader = this.sources[source.type];
      if (!loader) {
        throw new Error(`Unsupported script source type: ${source.type}`);
      }
      return await loader(source);
    }

    throw new Error('Invalid script source format');
  }

  /**
   * Load script from inline code
   */
  async loadFromInline(source) {
    const { code } = source;
    
    if (!code || typeof code !== 'string') {
      throw new Error('Inline source requires code property with string value');
    }
    
    return code;
  }

  /**
   * Load script from file system using streams
   */
  async loadFromFile(filePath) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      stream.on('end', () => {
        const content = chunks.join('');
        resolve(content);
      });
      
      stream.on('error', (error) => {
        reject(new Error(`Failed to read file ${filePath}: ${error.message}`));
      });
    });
  }

  /**
   * Load script from S3 (placeholder for future implementation)
   */
  async loadFromS3(source) {
    const { bucket, key, region = 'us-east-1' } = source;
    
    if (!bucket || !key) {
      throw new Error('S3 source requires bucket and key');
    }

    // TODO: Implement actual S3 reading
    // Example implementation:
    /*
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({ region });
    
    try {
      const result = await s3.getObject({ Bucket: bucket, Key: key }).promise();
      return result.Body.toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read from S3 ${bucket}/${key}: ${error.message}`);
    }
    */
    
    throw new Error(`S3 reading not implemented yet. Would read from s3://${bucket}/${key}`);
  }

  /**
   * Load script from database (placeholder for future implementation)
   */
  async loadFromDatabase(source) {
    const { connectionString, query, scriptId } = source;
    
    // TODO: Implement database reading
    throw new Error('Database reading not implemented yet');
  }

  /**
   * Load script from URL (placeholder for future implementation)
   */
  async loadFromUrl(source) {
    const { url, headers = {} } = source;
    
    // TODO: Implement URL reading
    throw new Error('URL reading not implemented yet');
  }

  /**
   * Validate script source format
   */
  validateSource(source) {
    if (typeof source === 'string') {
      return { type: 'file', path: source };
    }

    if (typeof source === 'object' && source.type) {
      const validTypes = Object.keys(this.sources);
      if (!validTypes.includes(source.type)) {
        throw new Error(`Invalid source type. Supported types: ${validTypes.join(', ')}`);
      }
      return source;
    }

    throw new Error('Invalid source format. Use file path string or source object with type property');
  }
}

module.exports = ScriptLoader;
