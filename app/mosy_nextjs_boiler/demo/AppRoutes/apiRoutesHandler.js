// AppRoutes/apiRoutesWrapper.js
import apiRoutesJson from './apiRoutes.json';
import { hiveRoutes } from '../../appConfigs/hiveRoutes';

const DEFAULT_BASE = hiveRoutes.hiveBaseRoute; // default root if none passed

/**
 * Get formatted API routes
 * @param {string} baseRoot Optional root path to prepend, e.g. "/newapp"
 */
export function getApiRoutes(baseRoot = DEFAULT_BASE) {
  const apiRoutes = {};

  Object.entries(apiRoutesJson).forEach(([module, endpoints]) => {
    apiRoutes[module] = {};
    Object.entries(endpoints).forEach(([action, url]) => {
      // Only prepend if relative URL
      apiRoutes[module][action] = url.startsWith('http') ? url : `${baseRoot}${url}`;
    });
  });

  return apiRoutes;
}

