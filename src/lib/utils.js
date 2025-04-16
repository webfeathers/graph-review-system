import { add } from "date-fns";
import { prisma } from "./db";

/**
 * Calculate SLA deadline based on transition and SLA configurations
 * @param {string} fromStatus - Starting status
 * @param {string} toStatus - Target status
 * @param {Date} startDate - Base date for calculation
 * @returns {Promise<Date|null>} - SLA deadline or null if no config found
 */
export async function calculateSLADeadline(fromStatus, toStatus, startDate) {
  try {
    // Find matching SLA configuration
    const slaConfig = await prisma.sLAConfig.findFirst({
      where: {
        statusFrom: fromStatus,
        statusTo: toStatus,
      },
    });
    
    if (!slaConfig) {
      return null;
    }
    
    // Calculate deadline by adding hours
    return add(startDate, { hours: slaConfig.durationHours });
  } catch (error) {
    console.error("Error calculating SLA deadline:", error);
    return null;
  }
}

/**
 * Format status for display
 * @param {string} status - Status code
 * @returns {string} - Formatted status text
 */
export function formatStatus(status) {
  return status.replace("_", " ");
}

/**
 * Check if a user has permission for an action
 * @param {Object} user - User object with role
 * @param {string} action - Action to check (e.g., "create", "update", "delete")
 * @param {string} resource - Resource type (e.g., "submission", "comment")
 * @param {Object} resourceData - Data about the resource
 * @returns {boolean} - Whether user has permission
 */
export function hasPermission(user, action, resource, resourceData = {}) {
  if (!user) return false;
  
  const { role } = user;
  
  // Admin has all permissions
  if (role === "ADMIN") return true;
  
  // Reviewer permissions
  if (role === "REVIEWER") {
    if (resource === "submission") {
      // Reviewers can view all submissions and update status
      if (action === "view" || action === "update-status") return true;
      // But can't create or delete submissions
      if (action === "create" || action === "delete") return false;
    }
    
    if (resource === "comment") {
      // Reviewers can create and view comments
      return true;
    }
  }
  
  // Submitter permissions
  if (role === "SUBMITTER") {
    if (resource === "submission") {
      // Submitters can create new submissions
      if (action === "create") return true;
      
      // Submitters can view and update their own submissions
      if ((action === "view" || action === "update") && 
          resourceData.submittedById === user.id) {
        return true;
      }
      
      // Submitters can't update status except under specific conditions
      if (action === "update-status" && 
          resourceData.submittedById === user.id &&
          resourceData.status === "REJECTED") {
        return true;
      }
    }
    
    if (resource === "comment") {
      // Submitters can comment on submissions they have access to
      return true;
    }
  }
  
  // Viewer permissions
  if (role === "VIEWER") {
    // Viewers have read-only access to everything
    return action === "view";
  }
  
  return false;
}

/**
 * Generate CSV content from data
 * @param {Array} data - Array of objects
 * @param {Array} headers - Array of header objects with key and label
 * @returns {string} - CSV string
 */
export function generateCSV(data, headers) {
  // Create header row
  const headerRow = headers.map(h => h.label).join(",");
  
  // Create data rows
  const rows = data.map(item => {
    return headers
      .map(header => {
        // Get value and escape commas or quotes if needed
        let value = item[header.key];
        
        // Convert to string and handle null/undefined
        value = value === null || value === undefined ? "" : String(value);
        
        // Escape quotes and wrap in quotes if contains commas
        if (value.includes('"')) {
          value = value.replace(/"/g, '""');
        }
        
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value}"`;
        }
        
        return value;
      })
      .join(",");
  });
  
  // Combine header and rows
  return [headerRow, ...rows].join("\n");
}

/**
 * Filter sensitive data from objects to be included in logs
 * @param {Object} data - Data to sanitize
 * @returns {Object} - Sanitized data
 */
export function sanitizeLogData(data) {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'credentials', 'auth'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    // Check if key is sensitive
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
    
    // Recursively sanitize objects
    else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  });
  
  return sanitized;
}