const ScriptRunner = require('../index');

/**
 * Example showing how to reuse device data for multiple purposes
 */
async function reuseDeviceData() {
  const runner = new ScriptRunner();
  
  try {
    // Step 1: Fetch devices once
    console.log("🔄 Fetching devices from Jamf...");
    const result = await runner.run(
      './scripts/jamf-device-fetcher.js',
      'josyscom',
      'PuneetAgarwal',
      'LTd.cwsZD3vbyJBT'
    );
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    const devices = result.devices;
    console.log(`✅ Fetched ${devices.length} devices`);
    
    // Step 2: Reuse the same device data for multiple purposes
    console.log("\n🔄 Reusing device data for multiple purposes...");
    
    // Purpose 1: Generate inventory report
    const inventoryReport = generateInventoryReport(devices);
    console.log("📋 Generated inventory report");
    
    // Purpose 2: Find devices needing attention
    const devicesNeedingAttention = findDevicesNeedingAttention(devices);
    console.log(`⚠️  Found ${devicesNeedingAttention.length} devices needing attention`);
    
    // Purpose 3: Group devices by department/owner
    const devicesByOwner = groupDevicesByOwner(devices);
    console.log(`👥 Grouped devices by ${Object.keys(devicesByOwner).length} owners`);
    
    // Purpose 4: Generate compliance report
    const complianceReport = generateComplianceReport(devices);
    console.log("✅ Generated compliance report");
    
    // Purpose 5: Export to different formats
    await exportDeviceData(devices, {
      inventoryReport,
      devicesNeedingAttention,
      devicesByOwner,
      complianceReport
    });
    
    return {
      originalData: result,
      inventoryReport,
      devicesNeedingAttention,
      devicesByOwner,
      complianceReport
    };
    
  } catch (error) {
    console.error("❌ Failed to reuse device data:", error.message);
    throw error;
  }
}

/**
 * Generate inventory report
 */
function generateInventoryReport(devices) {
  const totalDevices = devices.length;
  const managedDevices = devices.filter(d => d.general?.managed).length;
  const enrolledDevices = devices.filter(d => d.general?.enrolled).length;
  
  return {
    summary: {
      totalDevices,
      managedDevices,
      enrolledDevices,
      unmanagedDevices: totalDevices - managedDevices,
      unenrolledDevices: totalDevices - enrolledDevices
    },
    osDistribution: getOSDistribution(devices),
    modelDistribution: getModelDistribution(devices),
    lastCheckInStatus: getLastCheckInStatus(devices)
  };
}

/**
 * Find devices that need attention
 */
function findDevicesNeedingAttention(devices) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  return devices.filter(device => {
    const lastCheckIn = new Date(device.general?.lastContactTime);
    const isStale = lastCheckIn < thirtyDaysAgo;
    const isUnmanaged = !device.general?.managed;
    const isUnenrolled = !device.general?.enrolled;
    
    return isStale || isUnmanaged || isUnenrolled;
  }).map(device => ({
    id: device.id,
    name: device.general?.name,
    issues: [
      ...(new Date(device.general?.lastContactTime) < thirtyDaysAgo ? ['Stale check-in'] : []),
      ...(!device.general?.managed ? ['Not managed'] : []),
      ...(!device.general?.enrolled ? ['Not enrolled'] : [])
    ],
    lastCheckIn: device.general?.lastContactTime,
    managed: device.general?.managed,
    enrolled: device.general?.enrolled
  }));
}

/**
 * Group devices by owner
 */
function groupDevicesByOwner(devices) {
  const groups = {};
  
  devices.forEach(device => {
    const owner = device.userAndLocation?.realName || 
                  device.userAndLocation?.username || 
                  device.general?.name?.split("'s")[0] || 
                  'Unknown';
    
    if (!groups[owner]) {
      groups[owner] = [];
    }
    
    groups[owner].push({
      id: device.id,
      name: device.general?.name,
      model: device.hardware?.model,
      lastCheckIn: device.general?.lastContactTime,
      managed: device.general?.managed,
      enrolled: device.general?.enrolled
    });
  });
  
  return groups;
}

/**
 * Generate compliance report
 */
function generateComplianceReport(devices) {
  const totalDevices = devices.length;
  const managedDevices = devices.filter(d => d.general?.managed).length;
  const enrolledDevices = devices.filter(d => d.general?.enrolled).length;
  const recentCheckIns = devices.filter(d => {
    const lastCheckIn = new Date(d.general?.lastContactTime);
    const daysSince = (new Date() - lastCheckIn) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  }).length;
  
  return {
    compliance: {
      managementCompliance: ((managedDevices / totalDevices) * 100).toFixed(2) + '%',
      enrollmentCompliance: ((enrolledDevices / totalDevices) * 100).toFixed(2) + '%',
      activeDevices: ((recentCheckIns / totalDevices) * 100).toFixed(2) + '%'
    },
    recommendations: [
      ...(managedDevices < totalDevices * 0.9 ? ['Increase device management coverage'] : []),
      ...(enrolledDevices < totalDevices * 0.9 ? ['Improve device enrollment rates'] : []),
      ...(recentCheckIns < totalDevices * 0.8 ? ['Investigate devices with stale check-ins'] : [])
    ]
  };
}

/**
 * Export device data to different formats
 */
async function exportDeviceData(devices, reports) {
  console.log("💾 Exporting device data...");
  
  // Simulate different export formats
  console.log("📄 Exporting to JSON format");
  console.log("📊 Exporting to CSV format");
  console.log("📋 Exporting reports to PDF");
  console.log("🗄️  Saving to database");
  console.log("📧 Sending email reports");
  
  // In real implementation:
  // - JSON: fs.writeFileSync('devices.json', JSON.stringify(devices, null, 2))
  // - CSV: convertToCSV(devices)
  // - PDF: generatePDFReport(reports)
  // - Database: await db.devices.insertMany(devices)
  // - Email: await sendEmailReport(reports)
}

// Helper functions
function getOSDistribution(devices) {
  const distribution = {};
  devices.forEach(device => {
    const os = device.operatingSystem?.version || 'Unknown';
    distribution[os] = (distribution[os] || 0) + 1;
  });
  return distribution;
}

function getModelDistribution(devices) {
  const distribution = {};
  devices.forEach(device => {
    const model = device.hardware?.model || 'Unknown';
    distribution[model] = (distribution[model] || 0) + 1;
  });
  return distribution;
}

function getLastCheckInStatus(devices) {
  const now = new Date();
  const status = {
    'Last 24 hours': 0,
    'Last 7 days': 0,
    'Last 30 days': 0,
    'Older than 30 days': 0
  };
  
  devices.forEach(device => {
    const lastCheckIn = new Date(device.general?.lastContactTime);
    const daysDiff = (now - lastCheckIn) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 1) status['Last 24 hours']++;
    else if (daysDiff <= 7) status['Last 7 days']++;
    else if (daysDiff <= 30) status['Last 30 days']++;
    else status['Older than 30 days']++;
  });
  
  return status;
}

// Run example if called directly
if (require.main === module) {
  reuseDeviceData()
    .then(result => {
      console.log("\n🎉 Device data reuse demonstration completed!");
      console.log("📊 Inventory Summary:", result.inventoryReport.summary);
      console.log("⚠️  Devices needing attention:", result.devicesNeedingAttention.length);
      console.log("👥 Device owners:", Object.keys(result.devicesByOwner).length);
      console.log("✅ Compliance:", result.complianceReport.compliance);
    })
    .catch(error => {
      console.error("💥 Demonstration failed:", error.message);
      process.exit(1);
    });
}

module.exports = { reuseDeviceData };
