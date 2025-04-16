import React, { useState, useEffect } from 'react';
import Homepage from './components/Homepage';
import AdminDashboard from './components/AdminDashboard';
import BookingConfirmation from './components/BookingConfirmation';
import apiService from './services/api';
import { Calendar } from 'lucide-react';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [bookingReference, setBookingReference] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [bookingLookupError, setBookingLookupError] = useState('');
  const [bookingData, setBookingData] = useState(null);

  // Add this function definition
  const lookupBooking = async (reference, email) => {
    setIsLoading(true);
    setBookingLookupError('');

    if (!reference || !email) {
      setBookingLookupError('Please provide both reference number and email');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiService.bookings.lookupBooking(reference, email);

      if (response.success) {
        setBookingData(response.booking);
        setCurrentPage('booking-details');
      } else {
        setBookingLookupError(response.error || 'Booking not found');
      }
    } catch (error) {
      console.error('Error looking up booking:', error);
      setBookingLookupError('An error occurred while looking up your booking');
    }

    setIsLoading(false);
  };

  // Check authentication and load restaurant info on mount
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);

      // Check URL parameters for admin access or booking reference
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('admin')) {
        setCurrentPage('admin');
        setIsAuthenticated(true);
      } else if (urlParams.has('ref') && urlParams.has('email')) {
        // Handle booking lookup from URL
        const ref = urlParams.get('ref');
        const email = urlParams.get('email');
        await lookupBooking(ref, email);
      } else {
        // Original authentication check
        const token = localStorage.getItem('authToken');
        if (token) {
          try {
            // Validate token
            const response = await apiService.auth.getProfile();
            if (response.success) {
              setIsAuthenticated(true);
              if (window.location.pathname.includes('admin')) {
                setCurrentPage('admin');
              }
            } else {
              // Token invalid
              localStorage.removeItem('authToken');
            }
          } catch (error) {
            console.error('Auth check error:', error);
            localStorage.removeItem('authToken');
          }
        }
      }

      // Fetch restaurant info
      try {
        const response = await apiService.restaurant.getSettings();
        if (response.success) {
          setRestaurantInfo(response.settings);
        }
      } catch (error) {
        console.error('Error fetching restaurant info:', error);
      }

      setIsLoading(false);
    };

    initialize();
  }, []);

  // Login handler
  const handleLogin = async (e, directLogin = false) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    let credentials;

    if (directLogin) {
      // Use default credentials when called directly without a form
      credentials = {
        email: 'admin@leustache.com',
        password: 'password'
      };
    } else if (e && e.target && e.target.elements) {
      // Get credentials from the form if available
      credentials = {
        email: e.target.elements.email.value,
        password: e.target.elements.password.value
      };
    } else {
      // Fallback for any other scenarios
      credentials = {
        email: 'admin@leustache.com',
        password: 'password'
      };
    }

    try {
      console.log('Logging in with:', credentials);
      const response = await apiService.auth.login(credentials);

      if (response.success) {
        setIsAuthenticated(true);
        setCurrentPage('admin');
      } else {
        console.error('Login failed:', response.error);
        // You should show this error to the user
        alert('Login failed: ' + response.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An unexpected error occurred during login');
    }

    setIsLoading(false);
  };

  // Logout handler
  const handleLogout = () => {
    apiService.auth.logout();
    setIsAuthenticated(false);
    setCurrentPage('home');
  };

  // Navigation handlers
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  // Booking lookup handler
  const handleBookingLookup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setBookingLookupError('');

    if (!bookingReference || !bookingEmail) {
      setBookingLookupError('Please provide both reference number and email');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Looking up booking with:', {
        reference: bookingReference,
        email: bookingEmail
      });

      const response = await apiService.bookings.lookupBooking(
        bookingReference,
        bookingEmail
      );

      console.log('Lookup response:', response);

      if (response.success) {
        setBookingData(response.booking);
        setCurrentPage('booking-details');
      } else {
        setBookingLookupError(response.error || 'Booking not found');
      }
    } catch (error) {
      console.error('Error looking up booking:', error);
      setBookingLookupError('An error occurred while looking up your booking');
    }

    setIsLoading(false);
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
      case 'booking-details':
        return bookingData ?
          <BookingConfirmation
            booking={bookingData}
            onBack={() => navigateTo('home')}
          /> :
          <BookingLookupPage
            onLookup={handleBookingLookup}
            reference={bookingReference}
            setReference={setBookingReference}
            email={bookingEmail}
            setEmail={setBookingEmail}
            error={bookingLookupError}
          />;
      case 'booking-lookup':
        return (
          <BookingLookupPage
            onLookup={handleBookingLookup}
            reference={bookingReference}
            setReference={setBookingReference}
            email={bookingEmail}
            setEmail={setBookingEmail}
            error={bookingLookupError}
          />
        );
      default:
        return <Homepage onBookingClick={() => {}} onLogin={() => navigateTo('login')} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app min-h-screen bg-gray-50">
      {/* Navigation overlay for quick actions */}
      {currentPage === 'home' && (
        <div className="fixed top-4 right-4 z-50 flex space-x-2">
          <button
            onClick={() => navigateTo('booking-lookup')}
            className="px-3 py-1 bg-white text-primary border border-primary rounded-md shadow-md hover:bg-primary-light hover:bg-opacity-10 transition-colors"
          >
            Find My Booking
          </button>
          <button
  onClick={() => navigateTo('login')}
  className="px-3 py-1 bg-primary text-white rounded-md shadow-md hover:bg-primary-dark transition-colors"
>
  Admin Access
</button>
        </div>
      )}

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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
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
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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

// Booking lookup page
const BookingLookupPage = ({ onLookup, reference, setReference, email, setEmail, error }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto text-primary" />
          <h2 className="mt-2 text-3xl font-bold text-gray-900">Find Your Booking</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your booking reference and email address to view your reservation
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={onLookup}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="reference" className="sr-only">Booking Reference</label>
              <input
                id="reference"
                name="reference"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Booking Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Find Reservation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
