// src/components/BookingModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, Users as UsersIcon, MessageSquare } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';

const BookingModal = ({ booking, restaurantInfo, defaultDate, defaultTime, onClose, onSave }) => {
  const [step, setStep] = useState(1); // 1: Party Size, 2: Date, 3: Time, 4: Details & Tables
  const [partySize, setPartySize] = useState(booking?.partySize || null);
  const [date, setDate] = useState(booking ? moment(booking.date).format('YYYY-MM-DD') : defaultDate || '');
  const [time, setTime] = useState(booking ? moment(booking.timeSlot.start).format('HH:mm') : defaultTime || '');
  const [duration, setDuration] = useState(booking?.duration || 120);
  const [customerName, setCustomerName] = useState(booking?.customer?.name || '');
  const [customerEmail, setCustomerEmail] = useState(booking?.customer?.email || '');
  const [customerPhone, setCustomerPhone] = useState(booking?.customer?.phone || '');
  const [specialRequests, setSpecialRequests] = useState(booking?.specialRequests || '');
  const [status, setStatus] = useState(booking?.status || 'confirmed');
  const [selectedTables, setSelectedTables] = useState(booking?.tables || []);

  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // If editing a booking, skip directly to details
  useEffect(() => {
    if (booking) {
      setStep(4);
      fetchAvailableTables();
    }
  }, [booking]);

  // Check available dates when party size is selected
  useEffect(() => {
    if (partySize && restaurantInfo && !booking) {
      checkAvailableDates();
    }
  }, [partySize, restaurantInfo]);

  // Fetch available times when date is selected
  useEffect(() => {
    if (date && partySize && restaurantInfo && !booking) {
      fetchAvailableTimes();
    }
  }, [date, partySize, restaurantInfo]);

  // Fetch available tables when time is selected or on booking edit
  useEffect(() => {
    if (date && time && partySize && step >= 3) {
      fetchAvailableTables();
    }
  }, [date, time, partySize, step]);

  const checkAvailableDates = async () => {
    setIsLoading(true);

    try {
      const today = moment();
      const maxDate = moment().add(restaurantInfo?.bookingRules?.maxAdvanceBooking || 30, 'days');
      const dates = [];

      for (let m = moment(today); m.isSameOrBefore(maxDate); m.add(1, 'day')) {
        const dateStr = m.format('YYYY-MM-DD');
        const dayOfWeek = m.day();

        const daySettings = restaurantInfo.openingHours.find(h => h.day === dayOfWeek);
        if (!daySettings || daySettings.isClosed) {
          continue;
        }

        const isClosedDate = restaurantInfo.closedDates.some(closed =>
          moment(closed.date).isSame(m, 'day')
        );
        if (isClosedDate) {
          continue;
        }

        // For admin, show all open dates regardless of availability
        // Time slots will be checked separately
        dates.push(dateStr);
      }

      setAvailableDates(dates);
    } catch (error) {
      console.error('Error checking available dates:', error);
      setError('Error checking availability. Please try again.');
    }

    setIsLoading(false);
  };

  const fetchAvailableTimes = async () => {
    setIsLoading(true);

    try {
      const dayOfWeek = moment(date).day();
      const daySettings = restaurantInfo.openingHours.find(h => h.day === dayOfWeek);

      if (!daySettings || daySettings.isClosed) {
        setAvailableTimes([]);
        setIsLoading(false);
        return;
      }

      const timeSlotDuration = restaurantInfo.bookingRules.timeSlotDuration || 15;
      const maxDuration = restaurantInfo.bookingRules.maxDuration || 120;
      const startTime = moment(date + ' ' + daySettings.open);
      const endTime = moment(date + ' ' + daySettings.close);
      const lastBookingTime = moment(endTime).subtract(maxDuration, 'minutes');

      const slots = [];
      let currentSlot = moment(startTime);

      while (currentSlot.isSameOrBefore(lastBookingTime)) {
        const timeStr = currentSlot.format('HH:mm');
        // For admin, check availability including outdoor tables if needed
        const response = await apiService.bookings.checkAvailability(date, timeStr, partySize, { indoorOnly: false });

        if (response.success && response.data.available) {
          slots.push(timeStr);
        }

        currentSlot.add(timeSlotDuration, 'minutes');
      }

      setAvailableTimes(slots);
    } catch (error) {
      console.error('Error fetching available times:', error);
      setError('Error checking available times. Please try again.');
    }

    setIsLoading(false);
  };

  const fetchAvailableTables = async () => {
    try {
      const response = await apiService.tables.getTables();
      if (response.success) {
        let tables = response.data || [];

        if (date && time) {
          const availabilityResponse = await apiService.tables.getTableAvailability(date);
          if (availabilityResponse.success) {
            tables = tables.filter(table => {
              if (table.capacity < partySize) {
                return false;
              }
              // For admin, show all tables (indoor and outdoor)
              // If editing, include currently assigned tables
              if (booking && booking.tables?.some(t => t._id === table._id)) {
                return true;
              }
              // Check if table is available at selected time
              return true; // You'd implement more sophisticated availability check here
            });
          }
        }

        setAvailableTables(tables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const handlePartySizeSelect = (size) => {
    setPartySize(size);
    setStep(2);
    // Reset selections when party size changes
    setDate('');
    setTime('');
    setSelectedTables([]);
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

  const handleTableSelection = (table) => {
    setSelectedTables(prev => {
      const exists = prev.some(t => t._id === table._id);
      if (exists) {
        return prev.filter(t => t._id !== table._id);
      } else {
        return [...prev, table];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const bookingData = {
        customerName,
        customerEmail,
        customerPhone,
        partySize,
        date,
        time,
        duration,
        specialRequests,
        status,
        tables: selectedTables.map(t => t._id),
        isAdminBooking: true // Mark as admin booking to allow outdoor table assignment
      };

      await onSave(bookingData);
    } catch (error) {
      console.error('Error saving booking:', error);
      setError('Failed to save booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center mb-6">
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
              className={`w-12 h-1 ${
                step > stepNumber ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">
              {booking ? 'Edit Booking' : 'New Booking'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {!booking && renderStepIndicator()}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md">
              {error}
            </div>
          )}

          {/* Step 1: Party Size */}
          {step === 1 && !booking && (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <UsersIcon className="mr-2 text-primary" size={24} />
                Select Party Size
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {Array.from(
                  { length: restaurantInfo?.bookingRules?.maxPartySize || 6 },
                  (_, i) => i + 1
                ).map(num => (
                  <button
                    key={num}
                    onClick={() => handlePartySizeSelect(num)}
                    className={`p-4 border rounded-lg text-center hover:border-primary transition-colors ${
                      partySize === num ? 'border-primary bg-primary-light bg-opacity-10' : 'border-gray-300'
                    }`}
                  >
                    <div className="text-2xl font-bold">{num}</div>
                    <div className="text-sm text-gray-600">{num === 1 ? 'guest' : 'guests'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date Selection */}
          {step === 2 && !booking && (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="mr-2 text-primary" size={24} />
                Select Date
              </h3>
              {isLoading ? (
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
                      No available dates for the selected party size.
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
          {step === 3 && !booking && (
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Clock className="mr-2 text-primary" size={24} />
                Select Time
              </h3>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading available times...</p>
                </div>
              ) : availableTimes.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {availableTimes.map((timeSlot) => (
                      <button
                        key={timeSlot}
                        onClick={() => handleTimeSelect(timeSlot)}
                        className={`p-3 border rounded-lg text-center hover:border-primary transition-colors ${
                          time === timeSlot ? 'border-primary bg-primary-light bg-opacity-10' : 'border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{moment(timeSlot, 'HH:mm').format('h:mm A')}</div>
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
                  No available times for the selected date.
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

          {/* Step 4: Details & Table Assignment */}
          {step === 4 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {!booking && (
                <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Party Size:</span>
                      <div className="font-medium">{partySize} {partySize === 1 ? 'guest' : 'guests'}</div>
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
              )}

              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                {booking && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Party Size
                    </label>
                    <div className="relative">
                      <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <select
                        value={partySize}
                        onChange={(e) => setPartySize(parseInt(e.target.value))}
                        className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                      >
                        {Array.from(
                          { length: restaurantInfo?.bookingRules?.maxPartySize || 6 },
                          (_, i) => i + 1
                        ).map(num => (
                          <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Booking Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="seated">Seated</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                </select>
              </div>

              {/* Table Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Assignment
                </label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {availableTables.map(table => (
                    <div
                      key={table._id}
                      onClick={() => handleTableSelection(table)}
                      className={`p-3 border rounded-md cursor-pointer text-center ${
                        selectedTables.some(t => t._id === table._id)
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 hover:border-primary'
                      }`}
                    >
                      <div className="font-medium">Table {table.tableNumber}</div>
                      <div className="text-sm opacity-75">{table.capacity} seats</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-gray-400" size={18} />
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows="3"
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    placeholder="Any special requests or notes..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                {!booking && step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 text-primary hover:text-primary-dark"
                  >
                    ← Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : booking ? 'Update Booking' : 'Create Booking'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
