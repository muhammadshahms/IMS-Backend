const UAParser = require('ua-parser-js');

/**
 * Parse User Agent and extract device information
 * @param {string} userAgent - The User-Agent string from request headers
 * @returns {object} Device information
 */
const parseUserAgent = (userAgent) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType = 'desktop';
  if (result.device.type === 'mobile') {
    deviceType = 'mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet';
  } else if (result.device.type) {
    deviceType = result.device.type;
  }

  return {
    type: deviceType,
    browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
    os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    platform: result.device.vendor || result.device.model || 'Unknown',
    deviceVendor: result.device.vendor,
    deviceModel: result.device.model
  };
};

/**
 * Get IP address from request
 * @param {object} req - Express request object
 * @returns {string} IP address
 */
const getClientIP = (req) => {
  // Check for forwarded IPs (common in production with proxies/load balancers)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be comma-separated list
    return forwarded.split(',')[0].trim();
  }
  
  // Check other common headers
  return (
    req.headers['x-real-ip'] ||
    req.headers['cf-connecting-ip'] || // Cloudflare
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    'Unknown'
  );
};

/**
 * Get location data from IP (requires external service)
 * You can use services like ip-api.com, ipinfo.io, or maxmind
 * @param {string} ip - IP address
 * @returns {object} Location information
 */
const getLocationFromIP = async (ip) => {
  try {
    // Skip for local IPs
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip === 'Unknown') {
      return {
        country: 'Local',
        region: 'Local',
        city: 'Local',
        timezone: 'Local'
      };
    }

    // Using ip-api.com (free tier - 45 requests/minute)
    const axios = require('axios');
    const response = await axios.get(`http://ip-api.com/json/${ip}`, {
      timeout: 5000
    });

    if (response.data.status === 'success') {
      return {
        country: response.data.country,
        region: response.data.regionName,
        city: response.data.city,
        timezone: response.data.timezone,
        coordinates: {
          latitude: response.data.lat,
          longitude: response.data.lon
        }
      };
    }
  } catch (error) {
    console.error('Error fetching location:', error.message);
  }

  // Return default if location fetch fails
  return {
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
    timezone: 'Unknown'
  };
};

module.exports = {
  parseUserAgent,
  getClientIP,
  getLocationFromIP
};