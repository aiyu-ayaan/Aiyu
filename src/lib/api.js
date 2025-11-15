import pb from './pocketbase';

/**
 * Fetch settings data from PocketBase
 * @param {string} key - The settings key (e.g., 'about', 'header', 'homeScreen')
 * @returns {Promise<Object|null>} The settings data or null if not found
 */
export async function getSettings(key) {
  try {
    const records = await pb.collection('portfolio_settings').getFullList({
      filter: `key="${key}"`,
    });
    
    if (records.length === 0) {
      console.warn(`Settings not found for key: ${key}, falling back to local data`);
      return null;
    }
    
    return records[0].data;
  } catch (error) {
    console.error(`Error fetching settings for ${key}:`, error.message);
    return null;
  }
}

/**
 * Fetch all projects from PocketBase
 * @returns {Promise<Array|null>} List of projects or null if not found
 */
export async function getProjects() {
  try {
    const projects = await pb.collection('projects').getFullList({
      sort: '-year',
    });
    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    return null;
  }
}

/**
 * Fetch about data
 */
export async function getAboutData() {
  return await getSettings('about');
}

/**
 * Fetch header data
 */
export async function getHeaderData() {
  return await getSettings('header');
}

/**
 * Fetch home screen data
 */
export async function getHomeScreenData() {
  return await getSettings('homeScreen');
}

/**
 * Fetch site data
 */
export async function getSiteData() {
  return await getSettings('site');
}

/**
 * Fetch projects roles
 */
export async function getProjectsRoles() {
  const data = await getSettings('projectsRoles');
  return data.roles;
}
