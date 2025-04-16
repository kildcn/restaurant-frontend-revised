import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, AlignJustify, Info, AlertCircle } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';
import BookingConfirmation from './BookingConfirmation';

const BookingForm = () => {
  // Form state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // UI state
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDateLoading, setIsDateLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  // On mount, get restaurant info and initialize default date
  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      setIsLoading(true);
      const response = await apiService.restaurant.getSettings();
      if (response.success) {
        setRestaurantInfo(response.settings);

        // Extract closed dates
        const closedDates = response.settings.closedDates.map(dateObj =>
          moment(dateObj.date).format('YYYY-MM-DD')
        );
        setUnavailableDates(closedDates);
      } else {
        setMessage({
          text: 'Could not load restaurant information. Please try again later.',
          type: 'error'
        });
      }
      setIsLoading(false);
    };

    fetchRestaurantInfo();

    // Set the default date to today or next available day
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setDate(formattedDate);
  }, []);

  // When date or guest count changes, fetch available times
  useEffect(() => {
    if (date && restaurantInfo) {
      fetchAvailableTimes();
    }
  }, [date, guests, restaurantInfo]);

  const fetchAvailableTimes = async () => {
    setIsDateLoading(true);
    setMessage({ text: '', type: '' });

    try {
      // Format date and check if it's in closed dates
      const formattedDate = moment(date).format('YYYY-MM-DD');
      if (unavailableDates.includes(formattedDate)) {
        setAvailableTimes([]);
        setMessage({
          text: 'The restaurant is closed on this date.',
          type: 'error'
        });
        setIsDateLoading(false);
        return;
      }

      // Get day of week (0-6, Sunday to Saturday)
      const dayOfWeek = moment(date).day();

      // Check restaurant opening hours
      if (!restaurantInfo) {
        setIsDateLoading(false);
        return;
      }

      const daySettings = restaurantInfo.openingHours.find(h => h.day === dayOfWeek);

      if (!daySettings || daySettings.isClosed) {
        setAvailableTimes([]);
        setMessage({
          text: 'The restaurant is closed on this day. We are open Wednesday through Saturday.',
          type: 'error'
        });
        setIsDateLoading(false);
        return;
      }

      // Use the opening time as the default time for availability check
      const defaultTime = daySettings.open; // This will be something like "18:00"

      // Check time slot availability from API
      const response = await apiService.bookings.checkAvailability(date, defaultTime, guests);

      if (response.success && response.data.available) {
        // Generate time slots
        const timeSlotDuration = restaurantInfo.bookingRules.timeSlotDuration || 15;
        const maxDuration = restaurantInfo.bookingRules.maxDuration || 120;

        // Get opening and closing time
        const openTime = daySettings.open; // Format: "18:00"
        const closeTime = daySettings.close; // Format: "23:45"

        // Calculate available time slots
        const startTime = moment(formattedDate + ' ' + openTime);
        const endTime = moment(formattedDate + ' ' + closeTime);

        // Don't allow bookings starting less than minAdvanceBooking minutes from now
        const minAdvanceBooking = restaurantInfo.bookingRules.minAdvanceBooking || 60;
        const now = moment();
        const minimumBookingTime = now.add(minAdvanceBooking, 'minutes');

        // Last booking time should end maxDuration mins before closing
        const lastBookingTime = moment(endTime).subtract(maxDuration, 'minutes');

        const slots = [];
        let currentSlot = moment(startTime);

        while (currentSlot.isSameOrBefore(lastBookingTime)) {
          // Skip times in the past
          if (moment(date).isSame(moment(), 'day') && currentSlot.isBefore(minimumBookingTime)) {
            currentSlot.add(timeSlotDuration, 'minutes');
            continue;
          }

          // Calculate end time for this booking
          const endTimeForSlot = moment(currentSlot).add(maxDuration, 'minutes');

          slots.push({
            value: currentSlot.format('HH:mm'),
            label: currentSlot.format('h:mm A'),
            endTime: endTimeForSlot.format('h:mm A')
          });

          currentSlot.add(timeSlotDuration, 'minutes');
        }

        setAvailableTimes(slots.length > 0 ? slots : []);

        if (slots.length === 0) {
          setMessage({
            text: 'No available times for this date. Please select another date.',
            type: 'error'
          });
        }
      } else {
        setAvailableTimes([]);
        setMessage({
          text: response.data?.reason || 'No available times for the selected date.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching available times:', error);
      setAvailableTimes([]);
      setMessage({
        text: 'An error occurred while checking availability. Please try again.',
        type: 'error'
      });
    }

    setIsDateLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    // Validation
    if (guests > restaurantInfo?.bookingRules?.maxPartySize) {
      setMessage({
        text: `For parties of ${restaurantInfo.bookingRules.maxPartySize + 1} or more, please email us at ${restaurantInfo.contact.email}`,
        type: 'error'
      });
      setIsLoading(false);
      return;
    }

    try {
      // Prepare booking data
      const bookingDetails = {
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        partySize: guests,
        date,
        time,
        specialRequests,
        duration: restaurantInfo?.bookingRules?.maxDuration || 120
      };

      // Send booking request
      const response = await apiService.bookings.createBooking(bookingDetails);

      if (response.success) {
        setBookingData(response.booking);
        setShowConfirmation(true);
        // Reset form
        setTime('');
        setSpecialRequests('');
      } else {
        setMessage({
          text: response.error || 'There was an error processing your reservation. Please try again.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      setMessage({
        text: 'There was an error processing your reservation. Please try again.',
        type: 'error'
      });
    }

    setIsLoading(false);
  };

  // Calculate minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  // Calculate maximum date (maxAdvanceBooking days from now)
  const maxAdvanceDays = restaurantInfo?.bookingRules?.maxAdvanceBooking || 30;
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  // Handle booking to return to edit
  const handleBackToEdit = () => {
    setShowConfirmation(false);
  };

  if (showConfirmation && bookingData) {
    return <BookingConfirmation booking={bookingData} onBack={handleBackToEdit} />;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          <div className="flex items-start">
            {message.type === 'success' ?
              <Info className="mr-2 h-5 w-5 mt-0.5" /> :
              <AlertCircle className="mr-2 h-5 w-5 mt-0.5" />
            }
            <div>{message.text}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Selection */}
          <div>
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <Calendar className="mr-2 text-primary" size={18} />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              max={maxDateStr}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
            {restaurantInfo && (
              <div className="mt-1 text-sm text-gray-500">
                We are open Wednesday to Saturday
              </div>
            )}
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <User className="mr-2 text-primary" size={18} />
              Number of Guests
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              {Array.from(
                { length: restaurantInfo?.bookingRules?.maxPartySize || 6 },
                (_, i) => i + 1
              ).map(num => (
                <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
              ))}
              <option disabled value={restaurantInfo?.bookingRules?.maxPartySize + 1 || 7}>
                For {restaurantInfo?.bookingRules?.maxPartySize + 1 || 7}+ guests, please email us
              </option>
            </select>
            {restaurantInfo && restaurantInfo.bookingRules?.maxPartySize > 0 && (
              <div className="mt-1 text-sm text-gray-500">
                For parties of {restaurantInfo.bookingRules.maxPartySize + 1} or more, please email us
              </div>
            )}
          </div>

          {/* Time Selection */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <Clock className="mr-2 text-primary" size={18} />
              Select a Time
            </label>

            {isDateLoading ? (
              <div className="text-center p-4">Loading available times...</div>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {availableTimes.map((timeSlot) => (
                  <div key={timeSlot.value}>
                    <input
                      type="radio"
                      id={`time-${timeSlot.value}`}
                      name="time"
                      value={timeSlot.value}
                      checked={time === timeSlot.value}
                      onChange={() => setTime(timeSlot.value)}
                      className="sr-only"
                      required
                    />
                    <label
                      htmlFor={`time-${timeSlot.value}`}
                      className={`block text-center p-2 rounded-md cursor-pointer border transition-colors
                        ${time === timeSlot.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'}`}
                    >
                      <div>{timeSlot.label}</div>
                      <div className="text-xs mt-1">Until {timeSlot.endTime}</div>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-100 rounded-md text-gray-700">
                {message.text || 'No available times for the selected date.'}
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div>
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <User className="mr-2 text-primary" size={18} />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <Mail className="mr-2 text-primary" size={18} />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <Phone className="mr-2 text-primary" size={18} />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* Special Requests */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <AlignJustify className="mr-2 text-primary" size={18} />
              Special Requests (optional)
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              rows={3}
            ></textarea>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-3 rounded-md text-white font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-dark transition-colors"
            disabled={isLoading || !time || availableTimes.length === 0}
          >
            {isLoading ? 'Processing...' : 'Confirm Reservation'}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600 text-center">
          By making a reservation, you agree to our {restaurantInfo?.bookingRules?.maxDuration || 120}-minute table policy.
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
