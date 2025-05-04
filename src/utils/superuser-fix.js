/**
 * Utility functions to handle superuser state persistence and verification
 */

/**
 * Check if the current user is a superuser based on email and localStorage
 * @param {string} email - The user's email address
 * @returns {boolean} - Whether the user is a superuser
 */
export const checkSuperUserStatus = (email) => {
  if (!email) return false;
  
  // List of superuser emails
  const superUserEmails = [
    'ojidelawrence@gmail.com',
    'clickcom007@yahoo.com'
    // Add other superuser emails as needed
  ];
  
  // Check if email is in the superuser list
  const isSuperUserByEmail = superUserEmails.includes(email.toLowerCase());
  
  // Check if superuser status is stored in localStorage
  const storedSuperUserStatus = localStorage.getItem('glm-is-superuser') === 'true';
  
  // If user is a superuser by email, ensure it's stored in localStorage
  if (isSuperUserByEmail && !storedSuperUserStatus) {
    localStorage.setItem('glm-is-superuser', 'true');
  }
  
  return isSuperUserByEmail || storedSuperUserStatus;
};

/**
 * Set the superuser status in localStorage
 * @param {boolean} status - The superuser status to set
 */
export const setSuperUserStatus = (status) => {
  if (status) {
    localStorage.setItem('glm-is-superuser', 'true');
  } else {
    localStorage.removeItem('glm-is-superuser');
  }
};

/**
 * Clear the superuser status from localStorage
 */
export const clearSuperUserStatus = () => {
  localStorage.removeItem('glm-is-superuser');
};

/**
 * Get the superuser status from localStorage
 * @returns {boolean} - Whether the user is a superuser according to localStorage
 */
export const getSuperUserStatus = () => {
  return localStorage.getItem('glm-is-superuser') === 'true';
};
