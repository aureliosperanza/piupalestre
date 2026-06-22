// Globally intercept window.fetch to inject JWT tokens and capture 401 responses
const originalFetch = window.fetch;

window.fetch = async function (url, options = {}) {
  const token = localStorage.getItem('gym_token');
  
  // Set Authorization header for the gym manager (CRM) endpoints only.
  // Le aree pubblica e iscritto gestiscono i propri token a parte.
  const isMemberOrPublic = url.includes('/api/member') || url.includes('/api/public');
  if (token && (url.startsWith('/api') || url.startsWith('http://localhost:3001/api')) && !url.includes('/api/auth/') && !isMemberOrPublic) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  const response = await originalFetch(url, options);

  // If backend returns 401 (Unauthorized/Expired), purge local session and refresh.
  // Esclude auth/login e le aree pubblica/iscritto (hanno una loro gestione).
  if (response.status === 401 && !url.includes('/api/auth/login') && !isMemberOrPublic) {
    console.warn('Session expired or unauthorized token detected. Log-out triggered.');
    localStorage.removeItem('gym_token');
    localStorage.removeItem('gym_user');
    window.location.reload();
  }

  return response;
};
