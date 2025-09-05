/**
 * Jamf Device Analyzer Script
 * Analyzes device data and provides insights
 */

async function run(subdomain, username, password) {
  logger.info("🔍 Starting Jamf device analysis");
  logger.info(`Subdomain: ${subdomain}, Username: ${username}`);

  try {
    // Get authentication token
    const token = await getJamfToken(subdomain, username, password);
    
    // Fetch devices
    const devices = await fetchAllDevices(subdomain, token);
    
    // Analyze devices
    const analysis = analyzeDevices(devices);
    
    logger.info("📊 Analysis complete");
    return {
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    logger.error("❌ Analysis failed:", error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Analyze device data and provide insights
 */
function analyzeDevices(devices) {
  const totalDevices = devices.length;
  const managedDevices = devices.filter(d => d.general?.managed).length;
  const enrolledDevices = devices.filter(d => d.general?.enrolled).length;
  
  // OS Version analysis
  const osVersions = {};
  devices.forEach(device => {
    const version = device.operatingSystem?.version || 'Unknown';
    osVersions[version] = (osVersions[version] || 0) + 1;
  });
  
  // Model analysis
  const models = {};
  devices.forEach(device => {
    const model = device.hardware?.model || 'Unknown';
    models[model] = (models[model] || 0) + 1;
  });
  
  // Last check-in analysis
  const now = new Date();
  const checkInRanges = {
    'Last 24 hours': 0,
    'Last 7 days': 0,
    'Last 30 days': 0,
    'Older than 30 days': 0
  };
  
  devices.forEach(device => {
    const lastCheckIn = new Date(device.general?.lastContactTime);
    const daysDiff = (now - lastCheckIn) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) checkInRanges['Last 24 hours']++;
    else if (daysDiff <= 7) checkInRanges['Last 7 days']++;
    else if (daysDiff <= 30) checkInRanges['Last 30 days']++;
    else checkInRanges['Older than 30 days']++;
  });
  
  return {
    summary: {
      totalDevices,
      managedDevices,
      enrolledDevices,
      managementRate: ((managedDevices / totalDevices) * 100).toFixed(2) + '%',
      enrollmentRate: ((enrolledDevices / totalDevices) * 100).toFixed(2) + '%'
    },
    osVersions,
    models,
    checkInRanges
  };
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
  let hasMorePages = true;

  while (hasMorePages) {
    const url = `https://${subdomain}.jamfcloud.com/api/v1/computers-inventory?page=${page}&page-size=${pageSize}&sort=id`;
    
    const response = await httpGet(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    });

    allDevices.push(...response.results);
    hasMorePages = allDevices.length < (response.totalCount || 0);
    page++;

    if (hasMorePages) {
      await sleep(100);
    }
  }

  return allDevices;
}
