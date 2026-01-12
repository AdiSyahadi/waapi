/**
 * SSRF Protection Utility
 * Mencegah Server-Side Request Forgery attacks via webhook URLs
 */

const { URL } = require('url');
const dns = require('dns').promises;

// Blocked IP ranges (private networks, localhost, metadata services)
const BLOCKED_IP_PATTERNS = [
  // Localhost
  /^127\./,
  /^::1$/,
  /^0\./,
  
  // Private networks (RFC 1918)
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  
  // Link-local
  /^169\.254\./,
  /^fe80:/i,
  
  // AWS/Cloud metadata services
  /^169\.254\.169\.254$/,
  /^fd00:/i,
  
  // Other reserved
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // Carrier-grade NAT
  /^198\.18\./,  // Benchmark testing
  /^198\.51\.100\./,  // TEST-NET-2
  /^203\.0\.113\./,  // TEST-NET-3
  /^224\./,  // Multicast
  /^240\./,  // Reserved
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '*.local',
  '*.internal',
  '*.localhost',
  'kubernetes.default',
  'kubernetes.default.svc',
  'metadata.google.internal',
  'metadata.goog'
];

/**
 * Check if an IP address is private/blocked
 */
const isBlockedIP = (ip) => {
  if (!ip) return true;
  return BLOCKED_IP_PATTERNS.some(pattern => pattern.test(ip));
};

/**
 * Check if hostname is blocked
 */
const isBlockedHostname = (hostname) => {
  if (!hostname) return true;
  
  const lowerHostname = hostname.toLowerCase();
  
  // Direct matches
  if (BLOCKED_HOSTNAMES.includes(lowerHostname)) {
    return true;
  }
  
  // Wildcard matches
  for (const blocked of BLOCKED_HOSTNAMES) {
    if (blocked.startsWith('*.')) {
      const suffix = blocked.slice(1); // Remove *
      if (lowerHostname.endsWith(suffix) || lowerHostname === suffix.slice(1)) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Validate a webhook URL for SSRF protection
 * @param {string} urlString - The URL to validate
 * @returns {Object} - { valid: boolean, error: string|null, url: URL|null }
 */
const validateWebhookUrl = async (urlString) => {
  try {
    // Parse URL
    let url;
    try {
      url = new URL(urlString);
    } catch (e) {
      return { valid: false, error: 'Invalid URL format', url: null };
    }
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { 
        valid: false, 
        error: 'Only HTTP and HTTPS protocols are allowed', 
        url: null 
      };
    }
    
    // Check for blocked hostnames
    if (isBlockedHostname(url.hostname)) {
      return { 
        valid: false, 
        error: 'Webhook URL cannot point to localhost or internal networks', 
        url: null 
      };
    }
    
    // Check if hostname is an IP address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$/;
    
    if (ipv4Regex.test(url.hostname) || ipv6Regex.test(url.hostname)) {
      if (isBlockedIP(url.hostname)) {
        return { 
          valid: false, 
          error: 'Webhook URL cannot point to private IP addresses', 
          url: null 
        };
      }
    } else {
      // Resolve hostname to check for private IPs
      try {
        const addresses = await dns.resolve4(url.hostname);
        for (const addr of addresses) {
          if (isBlockedIP(addr)) {
            return { 
              valid: false, 
              error: 'Webhook URL resolves to a private IP address', 
              url: null 
            };
          }
        }
      } catch (dnsError) {
        // DNS resolution failed - allow it (might be valid external domain)
        // The actual webhook request will fail if domain is invalid
      }
    }
    
    // Check for non-standard ports that might indicate internal services
    const port = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
    const dangerousPorts = [22, 23, 25, 3306, 5432, 6379, 27017, 9200, 11211];
    if (dangerousPorts.includes(port)) {
      return { 
        valid: false, 
        error: `Port ${port} is not allowed for webhooks`, 
        url: null 
      };
    }
    
    return { valid: true, error: null, url };
    
  } catch (error) {
    return { 
      valid: false, 
      error: `URL validation error: ${error.message}`, 
      url: null 
    };
  }
};

/**
 * Synchronous version (without DNS lookup) for quick validation
 */
const validateWebhookUrlSync = (urlString) => {
  try {
    let url;
    try {
      url = new URL(urlString);
    } catch (e) {
      return { valid: false, error: 'Invalid URL format' };
    }
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    if (isBlockedHostname(url.hostname)) {
      return { valid: false, error: 'Webhook URL cannot point to localhost or internal networks' };
    }
    
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(url.hostname) && isBlockedIP(url.hostname)) {
      return { valid: false, error: 'Webhook URL cannot point to private IP addresses' };
    }
    
    return { valid: true, error: null };
    
  } catch (error) {
    return { valid: false, error: `Validation error: ${error.message}` };
  }
};

module.exports = {
  isBlockedIP,
  isBlockedHostname,
  validateWebhookUrl,
  validateWebhookUrlSync
};
