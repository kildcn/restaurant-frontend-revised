// src/components/UnifiedBookingForm.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, AlignJustify, Info, AlertCircle, X, Users as UsersIcon, MessageSquare } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';
import BookingConfirmation from './BookingConfirmation';

const UnifiedBookingForm = ({
  booking,
  restaurantInfo,
  defaultDate,
  defaultTime,
  onClose,
  onSave,
  isAdmin = false,
  showAsModal = false
}) => {
  // Form state (Step-by-step approach)
  const [step, setStep] = useState(1); // 1: Party Size, 2: Date, 3: Time, 4: Details
  const [partySize, setPartySize] = useState(booking?.partySize || (isAdmin && booking ? booking.partySize : null));
  const [date, setDate] = useState(booking ? moment(booking.date).format('YYYY-MM-DD') : defaultDate || '');
  const [time, setTime] = useState(booking ? moment(booking.timeSlot.start).format('HH:mm') : defaultTime || '');
  const [duration, setDuration] = useState(booking?.duration || 120);
  const [customerName, setCustomerName] = useState(booking?.customer?.name || '');
  const [customerEmail, setCustomerEmail] = useState(booking?.customer?.email || '');
  const [customerPhone, setCustomerPhone] = useState(booking?.customer?.phone || '');
  const [specialRequests, setSpecialRequests] = useState(booking?.specialRequests || '');
  const [status, setStatus] = useState(booking?.status || 'confirmed');
  const [selectedTables, setSelectedTables] = useState(booking?.tables || []);

  // Admin only: Allow outdoor tables
  const [allowOutdoorTables, setAllowOutdoorTables] = useState(isAdmin && booking?.tables?.some(t => t.section === 'outdoor'));

  // UI state
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDateLoading, setIsDateLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingData, setBookingData] = useState(null);

  // If editing a booking in admin mode, skip directly to details
  useEffect(() => {
    if (booking && isAdmin) {
      setStep(4);
      if (partySize) {
        fetchAvailableTables();
      }
    }
  }, [booking, isAdmin]);

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

  // Fetch available tables when time is selected (admin only) or when editing booking
  useEffect(() => {
    if (isAdmin && date && time && partySize && (step >= 3 || booking)) {
      fetchAvailableTables();
    }
  }, [isAdmin, date, time, partySize, step, allowOutdoorTables, booking]);

  const checkAvailableDates = async () => {
    setIsDateLoading(true);

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

        dates.push(dateStr);
      }

      setAvailableDates(dates);
    } catch (error) {
      console.error('Error checking available dates:', error);
      setMessage({ text: 'Error checking availability. Please try again.', type: 'error' });
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

        const timeStr = currentSlot.format('HH:mm');
        const response = await apiService.bookings.checkAvailability(formattedDate, timeStr, partySize, {
          indoorOnly: !isAdmin || !allowOutdoorTables,
          restrictToIndoor: !isAdmin
        });

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

  const fetchAvailableTables = async () => {
    if (!isAdmin) return; // Tables are only selectable by admin

    try {
      const response = await apiService.tables.getTables();
      console.log('Fetched tables for booking form:', response); // Debug log

      if (response.success) {
        let tables = response.data || [];
        console.log('Available tables before filtering:', tables); // Debug log

        // Filter out tables with insufficient capacity
        tables = tables.filter(table => table.capacity >= partySize);
        console.log('Tables after capacity filter:', tables); // Debug log

        // Filter out outdoor tables if not allowed
        if (!allowOutdoorTables) {
          tables = tables.filter(table => table.section !== 'outdoor');
          console.log('Tables after outdoor filter:', tables); // Debug log
        }

        // If editing, include currently assigned tables
        if (booking) {
          const currentTableIds = booking.tables?.map(t => t._id) || [];
          tables = tables.map(table => ({
            ...table,
            isCurrentlyAssigned: currentTableIds.includes(table._id)
          }));
        }

        setAvailableTables(tables);
        console.log('Final available tables:', tables); // Debug log
      } else {
        console.error('Failed to fetch tables:', response.error);
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
    if (!isAdmin) return; // Only admin can select tables

    // Prevent selecting outdoor tables unless allowed
    if (!allowOutdoorTables && table.section === 'outdoor') {
      setMessage({
        text: 'Outdoor tables can only be assigned by administrators.',
        type: 'error'
      });
      return;
    }

    setSelectedTables(prev => {
      const exists = prev.some(t => t._id === table._id);
      if (exists) {
        return prev.filter(t => t._id !== table._id);
      } else {
        return [...prev, table];
      }
    });

    setMessage({ text: '', type: '' }); // Clear any error
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    // Validate for admin bookings with table selection
    if (isAdmin && selectedTables.length === 0) {
      setMessage({ text: 'Please select at least one table.', type: 'error' });
      setIsLoading(false);
      return;
    }

    if (isAdmin) {
      const totalCapacity = selectedTables.reduce((sum, table) => sum + table.capacity, 0);
      if (totalCapacity < partySize) {
        setMessage({
          text: `Selected tables' total capacity (${totalCapacity}) is less than party size (${partySize}).`,
          type: 'error'
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const bookingDetails = {
        customerName,
        customerEmail,
        customerPhone,
        partySize,
        date,
        time,
        duration,
        specialRequests,
        isAdminBooking: isAdmin,
        // Customer bookings should only use indoor tables
        restrictToIndoor: !isAdmin,
        allowOutdoorTables: isAdmin && allowOutdoorTables,
        // Fix: Ensure tables are properly passed for admin bookings
        tables: isAdmin ? selectedTables.map(t => t._id) : undefined,
        ...(isAdmin && { status })
      };

      console.log('Submitting booking details:', bookingDetails); // Debug log

      if (onSave) {
        // For modal usage (admin)
        await onSave(bookingDetails);
      } else {
        // Direct API call (customer)
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
    return <BookingConfirmation booking={bookingData} onBack={() => setShowConfirmation(false)} />;
  }

  const formContent = (
    <>
      {!booking && renderStepIndicator()}

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
      {step === 1 && !booking && (
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
                  partySize === num ? 'border-primary bg-primary-light bg-opacity-10' : 'border-gray-300'
                }`}
              >
                <div className="text-2xl font-bold">{num}</div>
                <div className="text-sm text-gray-600">{num === 1 ? 'guest' : 'guests'}</div>
              </button>
            ))}
          </div>
          {restaurantInfo && restaurantInfo.bookingRules?.maxPartySize > 0 && !isAdmin && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              For parties of {restaurantInfo.bookingRules.maxPartySize + 1} or more, please email us
            </div>
          )}
        </div>
      )}

      {/* Step 2: Date Selection */}
      {step === 2 && !booking && (
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

          {/* Admin option to allow outdoor tables */}
          {isAdmin && (
            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={allowOutdoorTables}
                  onChange={(e) => setAllowOutdoorTables(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Include outdoor tables</span>
              </label>
            </div>
          )}

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

      {/* Step 4: Contact Details & Table Assignment */}
      {step === 4 && (
        <form onSubmit={handleSubmit}>
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

          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2 flex items-center">
                <User className="mr-2 text-primary" size={18} />
                Full Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
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
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
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
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
            </div>

            {/* Admin-specific fields */}
            {isAdmin && (
              <>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="seated">Seated</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>

                {/* Table Assignment for Admin */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-700 font-medium">
                      Table Assignment
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={allowOutdoorTables}
                        onChange={(e) => setAllowOutdoorTables(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-600">Allow outdoor tables</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                    {availableTables.map(table => {
                      const isSelected = selectedTables.some(t => t._id === table._id);
                      const isOutdoor = table.section === 'outdoor';
                      const isDisabled = isOutdoor && !allowOutdoorTables;

                      return (
                        <div
                          key={table._id}
                          onClick={() => !isDisabled && handleTableSelection(table)}
                          className={`p-3 border rounded-md cursor-pointer text-center ${
                            isSelected
                              ? 'border-primary bg-primary text-white'
                              : isDisabled
                              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                              : 'border-gray-300 hover:border-primary'
                          }`}
                        >
                          <div className="font-medium">Table {table.tableNumber}</div>
                          <div className="text-sm opacity-75">{table.capacity} seats</div>
                          <div className={`text-xs mt-1 ${
                            isSelected ? 'text-white' : 'text-gray-500'
                          }`}>
                            {table.section || 'indoor'}
                            {table.isCurrentlyAssigned && (
                              <span className="ml-1">(assigned)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {availableTables.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No tables found. Please ensure tables exist in the system.
                    </div>
                  )}
                </div>
              </>
            )}

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
              type="submit"
              className="ml-auto px-6 py-3 rounded-md text-white font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-dark transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : booking ? 'Update Booking' : 'Confirm Reservation'}
            </button>
          </div>

          {!isAdmin && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              By making a reservation, you agree to our {restaurantInfo?.bookingRules?.maxDuration || 120}-minute table policy.
            </div>
          )}
        </form>
      )}
    </>
  );

  if (showAsModal) {
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

            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {formContent}
    </div>
  );
};

export default UnifiedBookingForm;
