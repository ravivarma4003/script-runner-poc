/**
 * Jamf Device Fetcher Script
 * Fetches all devices from Jamf with pagination support
 * 
 * Required credentials:
 * - subdomain: Jamf subdomain (e.g., "company")
 * - username: Jamf username
 * - password: Jamf password
 */

async function run(credentials) {
  // Validate required credentials
  const requiredKeys = ['subdomain', 'username', 'password'];
  const missingKeys = requiredKeys.filter(key => !credentials[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required credentials: ${missingKeys.join(', ')}`);
  }

  const { subdomain, username, password } = credentials;
  
  logger.info("🚀 Starting Jamf device fetch process");
  logger.info(`Subdomain: ${subdomain}, Username: ${username}`);

  try {
    // Step 1: Generate authentication token
    logger.info("🔐 Generating authentication token...");
    const token = await getJamfToken(subdomain, username, password);
    logger.info("✅ Token generated successfully");

    // Step 2: Fetch all devices with pagination
    logger.info("📱 Fetching devices from Jamf...");
    const devices = await fetchAllDevices(subdomain, token);
    logger.info(`✅ Successfully fetched ${devices.length} devices`);

    // Step 3: Return raw device data for main logic to use
    logger.info("📊 Device summary:");
    logger.info(`- Total devices: ${devices.length}`);
    logger.info(`- Managed devices: ${devices.filter(d => d.general?.managed).length}`);
    logger.info(`- Enrolled devices: ${devices.filter(d => d.general?.enrolled).length}`);

    // Return generic data structure
    return {
      success: true,
      data: devices, // Raw device data from Jamf API
      timestamp: new Date().toISOString(),
      metadata: {
        subdomain,
        totalDevices: devices.length,
        fetchedAt: new Date().toISOString(),
        apiEndpoint: `https://${subdomain}.jamfcloud.com/api/v1/computers-inventory`
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

/**
 * Generate Jamf authentication token
 */
async function getJamfToken(subdomain, username, password) {
  const authUrl = `https://${subdomain}.jamfcloud.com/api/v1/auth/token`;
  const authHeader = `Basic ${base64Encode(username + ":" + password)}`;
  
  const response = await httpPost(authUrl, {}, {
    headers: {
      "Authorization": authHeader,
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  });

  if (!response.token) {
    throw new Error("Failed to obtain authentication token");
  }

  return response.token;
}

/**
 * Fetch all devices with pagination support
 */
async function fetchAllDevices(subdomain, token) {
  let allDevices = [];
  let page = 0;
  const pageSize = 100;
  let totalCount = 0;
  let hasMorePages = true;

  logger.info("📄 Starting paginated device fetch...");

  while (hasMorePages) {
    const url = `https://${subdomain}.jamfcloud.com/api/v1/computers-inventory?page=${page}&page-size=${pageSize}&sort=id`;
    
    logger.debug(`Fetching page ${page + 1} (${pageSize} devices per page)`);
    
    const response = await httpGet(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    if (!response.results || !Array.isArray(response.results)) {
      throw new Error("Invalid response format from Jamf API");
    }

    allDevices.push(...response.results);
    totalCount = response.totalCount || 0;
    
    logger.debug(`Page ${page + 1}: ${response.results.length} devices fetched`);
    logger.debug(`Total so far: ${allDevices.length}/${totalCount}`);

    hasMorePages = allDevices.length < totalCount;
    page++;

    if (hasMorePages) {
      await sleep(100);
    }
  }

  logger.info(`📊 Pagination complete: ${allDevices.length} devices across ${page} pages`);
  return allDevices;
}
