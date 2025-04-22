import React, { useState } from 'react';
import { Calendar, MapPin, Phone, Mail, Clock, Users, Utensils, Wine, Star } from 'lucide-react';

const Homepage = ({ restaurantInfo, onBookingClick }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
<div className="relative flex items-center justify-center h-96 text-white text-center px-4"
     style={{
       background: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(https://thegoldenbun.com/wp-content/uploads/2018/10/LEustache-French-restaurant-Berlin-restaurant-Schillerkiez-Berlin1.jpg) center/cover no-repeat'
     }}>
  <div className="max-w-3xl mx-auto">
    <h1 className="text-4xl md:text-5xl font-bold mb-4 font-display">L'Eustache</h1>
    <p className="text-xl mb-6">A casual French bistro with organic, local and seasonal cuisine</p>
    <button
      onClick={onBookingClick}
      className="px-6 py-3 rounded-md text-white font-medium text-lg shadow-lg bg-primary hover:bg-primary-dark transition-colors"
    >
      Reserve a Table
    </button>
  </div>
</div>

      {/* About Section */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-primary font-display">Welcome to L'Eustache</h2>
            <p className="text-xl mb-4 max-w-3xl mx-auto">
              We are a casual French bistro with an organic, local and seasonal cuisine accompanied by living wines!
            </p>
            <p className="max-w-3xl mx-auto">
              Our reservations allow you to secure your table for a duration of 2 hours.
              Tables of 7 or more people please email us at restaurantleustache@gmail.com
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Utensils size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Seasonal Cuisine</h3>
              <p>
                Experience our organic, local and seasonal French cuisine, prepared with passion and authenticity.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Wine size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Living Wines</h3>
              <p>
                Discover our selection of natural and biodynamic wines that perfectly complement our dishes.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Star size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Authentic Experience</h3>
              <p>
                Enjoy the warm atmosphere and authentic French hospitality in the heart of Berlin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Opening Hours and Contact Info */}
      <div className="bg-gray-100 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <Clock size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Opening Hours</h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Monday</span>
                  <span className="text-gray-500">Closed</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Tuesday</span>
                  <span className="text-gray-500">Closed</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Wednesday</span>
                  <span>6:00 PM - 11:45 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Thursday</span>
                  <span>6:00 PM - 11:45 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Friday</span>
                  <span>6:00 PM - 11:45 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">Saturday</span>
                  <span>6:00 PM - 11:45 PM</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Sunday</span>
                  <span className="text-gray-500">Closed</span>
                </div>
              </div>

              <p className="mt-4 text-sm text-center text-gray-600">
                Last reservation at 9:45 PM
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-4">
                <MapPin size={40} className="text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-center">Contact & Location</h3>

              <div className="space-y-4">
                <div className="flex items-start">
                  <MapPin className="mr-3 mt-1 text-primary" size={20} />
                  <div>
                    <p className="font-medium">Address</p>
                    <p className="text-gray-600">Weisestraße 49, 12049 Berlin</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Phone className="mr-3 mt-1 text-primary" size={20} />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-gray-600">
                      <a href="tel:01635172664" className="hover:text-primary">0163 5172664</a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Mail className="mr-3 mt-1 text-primary" size={20} />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-gray-600">
                      <a href="mailto:restaurantleustache@gmail.com" className="hover:text-primary">restaurantleustache@gmail.com</a>
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <a
                  href="https://maps.google.com/?q=Weisestraße 49, 12049 Berlin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  <MapPin size={16} className="mr-2" />
                  View on Map
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-primary text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 font-display">Ready to Experience L'Eustache?</h2>
          <p className="text-xl mb-8">Reserve your table now and enjoy our seasonal French cuisine</p>
          <button
            onClick={onBookingClick}
            className="px-8 py-3 bg-white text-primary rounded-md font-medium text-lg hover:bg-gray-100 transition-colors"
          >
            Book a Table
          </button>
        </div>
      </div>

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
