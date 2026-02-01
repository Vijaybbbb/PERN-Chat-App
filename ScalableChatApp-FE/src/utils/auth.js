// Authentication utility functions

export const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    localStorage.removeItem('user');
    return null;
  }
};

export const setStoredUser = (userData) => {
  try {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('id', userData.id);
  } catch (error) {
    console.error('Error storing user data:', error);
  }
};

export const clearStoredUser = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('id');
};

export const isAuthenticated = () => {
  const user = getStoredUser();
  return user && user.id && user.accessToken;
};

export const getAccessToken = () => {
  const user = getStoredUser();
  return user?.accessToken || null;
};

export const updateAccessToken = (newToken) => {
  const user = getStoredUser();
  if (user) {
    user.accessToken = newToken;
    setStoredUser(user);
  }
};