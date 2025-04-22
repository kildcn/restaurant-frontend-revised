import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, AlignJustify, Info, AlertCircle } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';
import BookingConfirmation from './BookingConfirmation';

const BookingForm = () => {
  // Form state (Step-by-step approach)
  const [step, setStep] = useState(1); // 1: Party Size, 2: Date, 3: Time, 4: Details
  const [guests, setGuests] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // UI state
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDateLoading, setIsDateLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  // Fetch restaurant info on mount
  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      setIsLoading(true);
      const response = await apiService.restaurant.getSettings();
      if (response.success) {
        setRestaurantInfo(response.settings);
      } else {
        setMessage({
          text: 'Could not load restaurant information. Please try again later.',
          type: 'error'
        });
      }
      setIsLoading(false);
    };

    fetchRestaurantInfo();
  }, []);

  // Check available dates when party size is selected
  useEffect(() => {
    if (guests && restaurantInfo) {
      checkAvailableDates();
    }
  }, [guests, restaurantInfo]);

  // Fetch available times when date is selected
  useEffect(() => {
    if (date && guests && restaurantInfo) {
      fetchAvailableTimes();
    }
  }, [date, guests, restaurantInfo]);

  const checkAvailableDates = async () => {
    setIsDateLoading(true);

    try {
      // Generate calendar for the next 30 days
      const today = moment();
      const maxDate = moment().add(restaurantInfo?.bookingRules?.maxAdvanceBooking || 30, 'days');
      const dates = [];

      // Check each date for availability
      for (let m = moment(today); m.isSameOrBefore(maxDate); m.add(1, 'day')) {
        const dateStr = m.format('YYYY-MM-DD');
        const dayOfWeek = m.day();

        // Check if restaurant is closed on this day
        const daySettings = restaurantInfo.openingHours.find(h => h.day === dayOfWeek);
        if (!daySettings || daySettings.isClosed) {
          continue;
        }

        // Check if this is a closed date
        const isClosedDate = restaurantInfo.closedDates.some(closed =>
          moment(closed.date).isSame(m, 'day')
        );
        if (isClosedDate) {
          continue;
        }

        // We don't check for specific time availability here - just whether the date has ANY availability
        // The time-specific check will happen in fetchAvailableTimes
        dates.push(dateStr);
      }

      setAvailableDates(dates);

      if (dates.length === 0) {
        setMessage({
          text: 'No available dates for the selected party size',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error checking available dates:', error);
      setMessage({
        text: 'Error checking availability. Please try again.',
        type: 'error'
      });
    }

    setIsDateLoading(false);
  };

  const fetchAvailableTimes = async () => {
    setIsDateLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const dayOfWeek = moment(date).day();
      const daySettings = restaurantInfo.openingHours.find(h => h.day === dayOfWeek);

      if (!daySettings || daySettings.isClosed) {
        setAvailableTimes([]);
        setMessage({
          text: 'The restaurant is closed on this day.',
          type: 'error'
        });
        setIsDateLoading(false);
        return;
      }

      // Generate time slots
      const timeSlotDuration = restaurantInfo.bookingRules.timeSlotDuration || 15;
      const maxDuration = restaurantInfo.bookingRules.maxDuration || 120;
      const openTime = daySettings.open;
      const closeTime = daySettings.close;

      const startTime = moment(formattedDate + ' ' + openTime);
      const endTime = moment(formattedDate + ' ' + closeTime);
      const minAdvanceBooking = restaurantInfo.bookingRules.minAdvanceBooking || 60;
      const now = moment();
      const minimumBookingTime = now.add(minAdvanceBooking, 'minutes');
      const lastBookingTime = moment(endTime).subtract(maxDuration, 'minutes');

      const slots = [];
      let currentSlot = moment(startTime);

      while (currentSlot.isSameOrBefore(lastBookingTime)) {
        if (moment(date).isSame(moment(), 'day') && currentSlot.isBefore(minimumBookingTime)) {
          currentSlot.add(timeSlotDuration, 'minutes');
          continue;
        }

        // Check availability for this specific time slot (indoor only for customer bookings)
        const timeStr = currentSlot.format('HH:mm');
        const response = await apiService.bookings.checkAvailability(formattedDate, timeStr, guests, { indoorOnly: true });

        if (response.success && response.data.available) {
          const endTimeForSlot = moment(currentSlot).add(maxDuration, 'minutes');
          slots.push({
            value: timeStr,
            label: currentSlot.format('h:mm A'),
            endTime: endTimeForSlot.format('h:mm A')
          });
        }

        currentSlot.add(timeSlotDuration, 'minutes');
      }

      setAvailableTimes(slots);

      if (slots.length === 0) {
        setMessage({
          text: 'No available times for this date. Please select another date.',
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

  const handlePartySizeSelect = (size) => {
    setGuests(size);
    setStep(2);
    // Reset date and time when party size changes
    setDate('');
    setTime('');
  };

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
    setStep(3);
    // Reset time when date changes
    setTime('');
  };

  const handleTimeSelect = (selectedTime) => {
    setTime(selectedTime);
    setStep(4);
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

      const response = await apiService.bookings.createBooking(bookingDetails);

      if (response.success) {
        setBookingData(response.booking);
        setShowConfirmation(true);
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

  const handleBackToEdit = () => {
    setShowConfirmation(false);
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      {[1, 2, 3, 4].map((stepNumber) => (
        <div key={stepNumber} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= stepNumber ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
            }`}
          >
            {stepNumber}
          </div>
          {stepNumber < 4 && (
            <div
              className={`w-16 h-1 ${
                step > stepNumber ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  if (showConfirmation && bookingData) {
    return <BookingConfirmation booking={bookingData} onBack={handleBackToEdit} />;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {renderStepIndicator()}

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

      {/* Step 1: Party Size */}
      {step === 1 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <User className="mr-2 text-primary" size={24} />
            Select Party Size
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from(
              { length: restaurantInfo?.bookingRules?.maxPartySize || 6 },
              (_, i) => i + 1
            ).map(num => (
              <button
                key={num}
                onClick={() => handlePartySizeSelect(num)}
                className={`p-4 border rounded-lg text-center hover:border-primary transition-colors ${
                  guests === num ? 'border-primary bg-primary-light bg-opacity-10' : 'border-gray-300'
                }`}
              >
                <div className="text-2xl font-bold">{num}</div>
                <div className="text-sm text-gray-600">{num === 1 ? 'guest' : 'guests'}</div>
              </button>
            ))}
          </div>
          {restaurantInfo && restaurantInfo.bookingRules?.maxPartySize > 0 && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              For parties of {restaurantInfo.bookingRules.maxPartySize + 1} or more, please email us
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date Selection */}
      {step === 2 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Calendar className="mr-2 text-primary" size={24} />
            Select Date
          </h3>
          {isDateLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Checking available dates...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableDates.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {availableDates.map((dateStr) => {
                    const momentDate = moment(dateStr);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => handleDateSelect(dateStr)}
                        className={`p-3 border rounded-lg text-center hover:border-primary transition-colors ${
                          date === dateStr ? 'border-primary bg-primary-light bg-opacity-10' : 'border-gray-300'
                        }`}
                      >
                        <div className="text-sm font-medium">{momentDate.format('ddd')}</div>
                        <div className="text-lg font-bold">{momentDate.format('D')}</div>
                        <div className="text-xs text-gray-600">{momentDate.format('MMM')}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  No available dates for the selected party size. Please try a smaller group.
                </div>
              )}
              <button
                onClick={() => setStep(1)}
                className="mt-4 text-primary hover:text-primary-dark"
              >
                ← Change party size
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Time Selection */}
      {step === 3 && (
        <div>
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <Clock className="mr-2 text-primary" size={24} />
            Select Time
          </h3>
          {isDateLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading available times...</p>
            </div>
          ) : availableTimes.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {availableTimes.map((timeSlot) => (
                  <button
                    key={timeSlot.value}
                    onClick={() => handleTimeSelect(timeSlot.value)}
                    className={`p-3 border rounded-lg text-center hover:border-primary transition-colors ${
                      time === timeSlot.value ? 'border-primary bg-primary-light bg-opacity-10' : 'border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{timeSlot.label}</div>
                    <div className="text-xs text-gray-600">Until {timeSlot.endTime}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="mt-4 text-primary hover:text-primary-dark"
              >
                ← Change date
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              No available times for the selected date. Please select another date.
              <button
                onClick={() => setStep(2)}
                className="block mt-4 mx-auto text-primary hover:text-primary-dark"
              >
                ← Change date
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Contact Details */}
      {step === 4 && (
        <form onSubmit={handleSubmit}>
          <h3 className="text-xl font-semibold mb-4">Contact Details</h3>

          <div className="mb-4 bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Party Size:</span>
                <div className="font-medium">{guests} {guests === 1 ? 'guest' : 'guests'}</div>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <div className="font-medium">{moment(date).format('ddd, MMM D, YYYY')}</div>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <div className="font-medium">{moment(time, 'HH:mm').format('h:mm A')}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
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

            <div>
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

            <div>
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

          <div className="mt-8 flex justify-between">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 text-primary hover:text-primary-dark"
            >
              ← Change time
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-md text-white font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-dark transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Confirm Reservation'}
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600 text-center">
            By making a reservation, you agree to our {restaurantInfo?.bookingRules?.maxDuration || 120}-minute table policy.
          </div>
        </form>
      )}
    </div>
  );
};

export default BookingForm;
