import React, { useState, useEffect } from 'react';
import Homepage from './components/Homepage';
import AdminDashboard from './components/AdminDashboard';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    // In a real app, this would verify authentication status
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);

      // If trying to access admin and already authenticated, show admin dashboard
      if (window.location.pathname.includes('admin')) {
        setCurrentPage('admin');
      }
    }
  }, []);

  // Simple login handler for demo
  const handleLogin = (e) => {
    e.preventDefault();
    // In a real app, this would make an API call
    localStorage.setItem('authToken', 'demo-token');
    setIsAuthenticated(true);
    setCurrentPage('admin');
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setCurrentPage('home');
  };

  // Navigation handlers
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  // Render the appropriate page
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Homepage onBookingClick={() => {}} onLogin={() => navigateTo('login')} />;
      case 'login':
        return isAuthenticated ?
          <AdminDashboard onLogout={handleLogout} /> :
          <LoginPage onLogin={handleLogin} />;
      case 'admin':
        return isAuthenticated ?
          <AdminDashboard onLogout={handleLogout} /> :
          <LoginPage onLogin={handleLogin} />;
      default:
        return <Homepage onBookingClick={() => {}} onLogin={() => navigateTo('login')} />;
    }
  };

  return (
    <div className="app">
      {renderPage()}
    </div>
  );
};

// Simple login page
const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">L'Eustache</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to admin dashboard</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={onLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              style={{ backgroundColor: '#FF5733' }}
            >
              Sign in
            </button>
          </div>

          <div className="text-center text-sm">
            <p className="text-gray-500">
              Demo credentials: <br />
              Email: admin@leustache.com <br />
              Password: password
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
