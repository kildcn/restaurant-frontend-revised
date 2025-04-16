import React, { useState } from 'react';
import BookingForm from './BookingForm';
import { Calendar, MapPin, Phone, Mail, Clock, Users } from 'lucide-react';

const Homepage = () => {
  const [showBooking, setShowBooking] = useState(false);

  const handleBookingClick = () => {
    setShowBooking(true);
    setTimeout(() => {
      document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="relative flex items-center justify-center h-96 text-white text-center px-4"
           style={{
             background: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(/api/placeholder/1200/800) center/cover no-repeat'
           }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">L'Eustache</h1>
          <p className="text-xl mb-6">A casual French bistro with organic, local and seasonal cuisine</p>
          <button
            onClick={handleBookingClick}
            className="px-6 py-3 rounded-md text-white font-medium text-lg shadow-lg"
            style={{ backgroundColor: '#FF5733' }}
          >
            Reserve a Table
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4" style={{ color: '#FF5733' }}>Welcome to L'Eustache</h2>
            <p className="text-xl mb-4 max-w-3xl mx-auto">
              We are a casual French bistro with an organic, local and seasonal cuisine accompanied by living wines!
            </p>
            <p className="max-w-3xl mx-auto">
              Our reservations allow you to secure your table for a duration of 2 hours.
              Tables of 7 or more people please email us at restaurantleustache@gmail.com
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center mb-4">
                <Users size={40} style={{ color: '#FF5733' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Seasonal Cuisine</h3>
              <p>
                Experience our organic, local and seasonal French cuisine, prepared with passion and authenticity.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center mb-4">
                <Clock size={40} style={{ color: '#FF5733' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Opening Hours</h3>
              <p>
                <strong>Wednesday - Saturday</strong><br />
                6:00 PM - 11:45 PM<br />
                <span className="text-sm text-gray-600">Last reservation at 9:45 PM</span>
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="flex justify-center mb-4">
                <MapPin size={40} style={{ color: '#FF5733' }} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Find Us</h3>
              <p>
                Weisestraße 49, 12049 Berlin<br />
                <Phone className="inline mr-1" size={14} /> 0163 5172664<br />
                <Mail className="inline mr-1" size={14} /> restaurantleustache@gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Section */}
      {showBooking && (
        <div id="booking-section" className="py-16 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8" style={{ color: '#FF5733' }}>Make a Reservation</h2>
            <BookingForm />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-6 px-4 mt-auto">
        <div className="max-w-6xl mx-auto text-center">
          <p>© {new Date().getFullYear()} L'Eustache • Weisestraße 49, 12049 Berlin</p>
          <p className="mt-2">
            <Phone className="inline mx-1" size={16} /> 0163 5172664 •
            <Mail className="inline mx-1" size={16} /> restaurantleustache@gmail.com
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
