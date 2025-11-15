import pb from './pocketbase';

/**
 * Fetch settings data from PocketBase
 * @param {string} key - The settings key (e.g., 'about', 'header', 'homeScreen')
 * @returns {Promise<Object>} The settings data
 */
export async function getSettings(key) {
  try {
    const records = await pb.collection('portfolio_settings').getFullList({
      filter: `key="${key}"`,
    });
    
    if (records.length === 0) {
      throw new Error(`Settings not found for key: ${key}`);
    }
    
    return records[0].data;
  } catch (error) {
    console.error(`Error fetching settings for ${key}:`, error);
    throw error;
  }
}

/**
 * Fetch all projects from PocketBase
 * @returns {Promise<Array>} List of projects
 */
export async function getProjects() {
  try {
    const projects = await pb.collection('projects').getFullList({
      sort: '-year',
    });
    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
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
