import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, Info, Plus, X, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';

const RestaurantSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [restaurantInfo, setRestaurantInfo] = useState(null);

  // Form state for different settings
  const [openingHours, setOpeningHours] = useState([]);
  const [bookingRules, setBookingRules] = useState({});
  const [closedDates, setClosedDates] = useState([]);
  const [specialEvents, setSpecialEvents] = useState([]);

  // New closed date form
  const [newClosedDate, setNewClosedDate] = useState('');
  const [closedDateReason, setClosedDateReason] = useState('');

  // New special event form
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventOpen, setNewEventOpen] = useState('');
  const [newEventClose, setNewEventClose] = useState('');
  const [newEventNotes, setNewEventNotes] = useState('');

  // Load restaurant settings on mount
  useEffect(() => {
    fetchRestaurantSettings();
  }, []);

  const fetchRestaurantSettings = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.restaurant.getSettings();
      if (response.success) {
        setRestaurantInfo(response.settings);

        // Initialize form state
        setOpeningHours(response.settings.openingHours);
        setBookingRules(response.settings.bookingRules);
        setClosedDates(response.settings.closedDates);
        setSpecialEvents(response.settings.specialEvents);
      } else {
        setMessage({
          text: response.error || 'Failed to load restaurant settings',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error fetching restaurant settings:', error);
      setMessage({
        text: 'An error occurred while loading settings',
        type: 'error'
      });
    }
    setIsLoading(false);
  };

  // Update opening hours
  const handleOpeningHoursChange = (index, field, value) => {
    const updatedHours = [...openingHours];
    updatedHours[index][field] = value;
    setOpeningHours(updatedHours);
  };

  // Update booking rules
  const handleBookingRulesChange = (field, value) => {
    setBookingRules({
      ...bookingRules,
      [field]: value
    });
  };

  // Save opening hours
  const saveOpeningHours = async () => {
    setIsSaving(true);
    try {
      const response = await apiService.restaurant.updateOpeningHours(openingHours);
      if (response.success) {
        setMessage({
          text: 'Opening hours updated successfully',
          type: 'success'
        });
      } else {
        setMessage({
          text: response.error || 'Failed to update opening hours',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error updating opening hours:', error);
      setMessage({
        text: 'An error occurred while updating opening hours',
        type: 'error'
      });
    }
    setIsSaving(false);
  };

  // Save booking rules
  const saveBookingRules = async () => {
    setIsSaving(true);
    try {
      const response = await apiService.restaurant.updateBookingRules(bookingRules);
      if (response.success) {
        setMessage({
          text: 'Booking rules updated successfully',
          type: 'success'
        });
      } else {
        setMessage({
          text: response.error || 'Failed to update booking rules',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error updating booking rules:', error);
      setMessage({
        text: 'An error occurred while updating booking rules',
        type: 'error'
      });
    }
    setIsSaving(false);
  };

  // Add closed date
  const addClosedDate = async (e) => {
    e.preventDefault();
    if (!newClosedDate || !closedDateReason) {
      setMessage({
        text: 'Please provide both date and reason',
        type: 'error'
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiService.restaurant.addClosedDate(newClosedDate, closedDateReason);
      if (response.success) {
        setClosedDates(response.closedDates);
        setMessage({
          text: 'Closed date added successfully',
          type: 'success'
        });
        // Reset form
        setNewClosedDate('');
        setClosedDateReason('');
      } else {
        setMessage({
          text: response.error || 'Failed to add closed date',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error adding closed date:', error);
      setMessage({
        text: 'An error occurred while adding closed date',
        type: 'error'
      });
    }
    setIsSaving(false);
  };

  // Add special event
  const addSpecialEvent = async (e) => {
    e.preventDefault();
    if (!newEventName || !newEventDate) {
      setMessage({
        text: 'Please provide at least event name and date',
        type: 'error'
      });
      return;
    }

    const eventData = {
      name: newEventName,
      date: newEventDate,
      notes: newEventNotes,
    };

    // Add custom hours if provided
    if (newEventOpen && newEventClose) {
      eventData.customOpeningHours = {
        open: newEventOpen,
        close: newEventClose
      };
    }

    setIsSaving(true);
    try {
      const response = await apiService.restaurant.addSpecialEvent(eventData);
      if (response.success) {
        setSpecialEvents(response.specialEvents);
        setMessage({
          text: 'Special event added successfully',
          type: 'success'
        });
        // Reset form
        setNewEventName('');
        setNewEventDate('');
        setNewEventOpen('');
        setNewEventClose('');
        setNewEventNotes('');
      } else {
        setMessage({
          text: response.error || 'Failed to add special event',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error adding special event:', error);
      setMessage({
        text: 'An error occurred while adding special event',
        type: 'error'
      });
    }
    setIsSaving(false);
  };

  // Get day name from day number
  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-8">
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

      {/* Opening Hours Settings */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Opening Hours</h3>
          <button
            onClick={saveOpeningHours}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-4">
          {openingHours && openingHours.map((dayHours, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 border-b pb-4">
              <div className="flex items-center">
                <span className="font-medium w-32">{getDayName(dayHours.day)}</span>
                <div className="ml-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!dayHours.isClosed}
                      onChange={(e) => handleOpeningHoursChange(index, 'isClosed', !e.target.checked)}
                      className="mr-2"
                    />
                    <span>Open</span>
                  </label>
                </div>
              </div>

              {!dayHours.isClosed && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Opening Time</label>
                    <input
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => handleOpeningHoursChange(index, 'open', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Closing Time</label>
                    <input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => handleOpeningHoursChange(index, 'close', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Booking Rules Settings */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Booking Rules</h3>
          <button
            onClick={saveBookingRules}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Time Slot Duration (minutes)</label>
            <input
              type="number"
              min="15"
              max="60"
              value={bookingRules.timeSlotDuration || 15}
              onChange={(e) => handleBookingRulesChange('timeSlotDuration', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many minutes between each available time slot
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Max Booking Duration (minutes)</label>
            <input
              type="number"
              min="30"
              max="240"
              value={bookingRules.maxDuration || 120}
              onChange={(e) => handleBookingRulesChange('maxDuration', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default duration for each booking (e.g., 120 = 2 hours)
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Min Advance Booking (minutes)</label>
            <input
              type="number"
              min="0"
              max="1440"
              value={bookingRules.minAdvanceBooking || 60}
              onChange={(e) => handleBookingRulesChange('minAdvanceBooking', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many minutes in advance a booking must be made
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Max Advance Booking (days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={bookingRules.maxAdvanceBooking || 30}
              onChange={(e) => handleBookingRulesChange('maxAdvanceBooking', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              How many days in advance a booking can be made
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Buffer Between Bookings (minutes)</label>
            <input
              type="number"
              min="0"
              max="60"
              value={bookingRules.bufferBetweenBookings || 15}
              onChange={(e) => handleBookingRulesChange('bufferBetweenBookings', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Buffer time between consecutive bookings for the same table
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Max Party Size (for online bookings)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={bookingRules.maxPartySize || 6}
              onChange={(e) => handleBookingRulesChange('maxPartySize', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of guests for online bookings
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Max Capacity Threshold (%)</label>
            <input
              type="number"
              min="50"
              max="100"
              value={bookingRules.maxCapacityThreshold || 90}
              onChange={(e) => handleBookingRulesChange('maxCapacityThreshold', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum percentage of restaurant capacity that can be booked online
            </p>
          </div>
        </div>
      </div>

      {/* Closed Dates Management */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Closed Dates</h3>

        {/* Add new closed date */}
        <form onSubmit={addClosedDate} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium mb-3">Add New Closed Date</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={newClosedDate}
                onChange={(e) => setNewClosedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Reason</label>
              <input
                type="text"
                value={closedDateReason}
                onChange={(e) => setClosedDateReason(e.target.value)}
                placeholder="e.g., Holiday, Staff Event, Maintenance"
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add Closed Date
            </button>
          </div>
        </form>

        {/* Closed dates list */}
        <div className="mt-4">
          <h4 className="font-medium mb-3">Current Closed Dates</h4>

          {closedDates && closedDates.length > 0 ? (
            <div className="space-y-2">
              {closedDates.map((date, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 border border-gray-200 rounded bg-gray-50"
                >
                  <div className="flex items-center">
                    <Calendar className="text-primary mr-2" size={16} />
                    <div>
                      <div className="font-medium">
                        {moment(date.date).format('dddd, MMMM D, YYYY')}
                      </div>
                      <div className="text-sm text-gray-600">{date.reason}</div>
                    </div>
                  </div>
                  <button
                    className="text-red-500 hover:text-red-700"
                    onClick={() => {/* Implement delete functionality */}}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No closed dates have been added yet.
            </div>
          )}
        </div>
      </div>

      {/* Special Events Management */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Special Events</h3>

        {/* Add new special event */}
        <form onSubmit={addSpecialEvent} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h4 className="font-medium mb-3">Add New Special Event</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Event Name</label>
              <input
                type="text"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="e.g., Wine Tasting, Chef's Special"
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Custom Opening Time (optional)</label>
              <input
                type="time"
                value={newEventOpen}
                onChange={(e) => setNewEventOpen(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Custom Closing Time (optional)</label>
              <input
                type="time"
                value={newEventClose}
                onChange={(e) => setNewEventClose(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Notes (optional)</label>
              <textarea
                value={newEventNotes}
                onChange={(e) => setNewEventNotes(e.target.value)}
                placeholder="Additional information about the event..."
                className="w-full p-2 border border-gray-300 rounded"
                rows="2"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add Special Event
            </button>
          </div>
        </form>

        {/* Special events list */}
        <div className="mt-4">
          <h4 className="font-medium mb-3">Upcoming Special Events</h4>

          {specialEvents && specialEvents.length > 0 ? (
            <div className="space-y-3">
              {specialEvents
                .filter(event => moment(event.date).isSameOrAfter(moment(), 'day'))
                .sort((a, b) => moment(a.date).diff(moment(b.date)))
                .map((event, index) => (
                  <div
                    key={index}
                    className="p-3 border border-gray-200 rounded bg-gray-50"
                  >
                    <div className="flex justify-between">
                      <div className="font-medium text-primary">{event.name}</div>
                      <div className="text-sm">
                        {moment(event.date).format('dddd, MMMM D, YYYY')}
                      </div>
                    </div>

                    {event.customOpeningHours && (
                      <div className="text-sm mt-1">
                        <span className="font-medium">Custom Hours:</span> {event.customOpeningHours.open} - {event.customOpeningHours.close}
                      </div>
                    )}

                    {event.notes && (
                      <div className="text-sm text-gray-600 mt-1">{event.notes}</div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No special events have been added yet.
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={fetchRestaurantSettings}
          className="px-4 py-2 text-primary border border-primary rounded hover:bg-primary-light hover:bg-opacity-10 transition-colors flex items-center mx-auto"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh Settings
        </button>
      </div>
    </div>
  );
};

export default RestaurantSettings;
