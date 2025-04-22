// src/components/SimplifiedSettings.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle, Save, RefreshCw } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';

const SimplifiedSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('hours');

  // Settings data
  const [openingHours, setOpeningHours] = useState([]);
  const [bookingRules, setBookingRules] = useState({});
  const [closedDates, setClosedDates] = useState([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.restaurant.getSettings();
      if (response.success) {
        setOpeningHours(response.settings.openingHours);
        setBookingRules(response.settings.bookingRules);
        setClosedDates(response.settings.closedDates);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ text: 'Failed to load settings', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      if (activeTab === 'hours') {
        const response = await apiService.restaurant.updateOpeningHours(openingHours);
        if (response.success) {
          setMessage({ text: 'Opening hours saved successfully', type: 'success' });
        }
      } else if (activeTab === 'rules') {
        const response = await apiService.restaurant.updateBookingRules(bookingRules);
        if (response.success) {
          setMessage({ text: 'Booking rules saved successfully', type: 'success' });
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ text: 'Failed to save settings', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const addClosedDate = async (date, reason) => {
    if (!date || !reason) return;

    try {
      const response = await apiService.restaurant.addClosedDate(date, reason);
      if (response.success) {
        setClosedDates(response.closedDates);
        setMessage({ text: 'Closed date added successfully', type: 'success' });
      }
    } catch (error) {
      console.error('Error adding closed date:', error);
      setMessage({ text: 'Failed to add closed date', type: 'error' });
    }
  };

  const handleOpeningHoursChange = (index, field, value) => {
    const updated = [...openingHours];
    updated[index][field] = value;
    setOpeningHours(updated);
  };

  const handleBookingRulesChange = (field, value) => {
    setBookingRules({ ...bookingRules, [field]: value });
  };

  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2" />
            <div>{message.text}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('hours')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'hours'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Opening Hours
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rules'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Booking Rules
            </button>
            <button
              onClick={() => setActiveTab('dates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dates'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Closed Dates
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg p-6">
        {activeTab === 'hours' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Opening Hours</h3>
            <div className="space-y-4">
              {openingHours.map((dayHours, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-28 font-medium">{getDayName(dayHours.day)}</div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!dayHours.isClosed}
                      onChange={(e) => handleOpeningHoursChange(index, 'isClosed', !e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="ml-2">Open</span>
                  </label>
                  {!dayHours.isClosed && (
                    <>
                      <input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) => handleOpeningHoursChange(index, 'open', e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) => handleOpeningHoursChange(index, 'close', e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Booking Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Time Slot Duration (minutes)</label>
                <input
                  type="number"
                  value={bookingRules.timeSlotDuration || 15}
                  onChange={(e) => handleBookingRulesChange('timeSlotDuration', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Booking Duration (minutes)</label>
                <input
                  type="number"
                  value={bookingRules.maxDuration || 120}
                  onChange={(e) => handleBookingRulesChange('maxDuration', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Min Advance Booking (minutes)</label>
                <input
                  type="number"
                  value={bookingRules.minAdvanceBooking || 60}
                  onChange={(e) => handleBookingRulesChange('minAdvanceBooking', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Advance Booking (days)</label>
                <input
                  type="number"
                  value={bookingRules.maxAdvanceBooking || 30}
                  onChange={(e) => handleBookingRulesChange('maxAdvanceBooking', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Party Size</label>
                <input
                  type="number"
                  value={bookingRules.maxPartySize || 6}
                  onChange={(e) => handleBookingRulesChange('maxPartySize', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Buffer Between Bookings (minutes)</label>
                <input
                  type="number"
                  value={bookingRules.bufferBetweenBookings || 15}
                  onChange={(e) => handleBookingRulesChange('bufferBetweenBookings', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dates' && (
          <div>
            <h3 className="text-lg font-medium mb-4">Closed Dates</h3>

            {/* Add new closed date form */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Closed Date</h4>
              <form onSubmit={(e) => {
                e.preventDefault();
                const date = e.target.date.value;
                const reason = e.target.reason.value;
                addClosedDate(date, reason);
                e.target.reset();
              }} className="flex space-x-4">
                <input
                  type="date"
                  name="date"
                  min={moment().format('YYYY-MM-DD')}
                  required
                  className="rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
                <input
                  type="text"
                  name="reason"
                  placeholder="Reason (e.g., Holiday)"
                  required
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Closed dates list */}
            <div className="space-y-2">
              {closedDates.length > 0 ? (
                closedDates.map((date, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium">{moment(date.date).format('dddd, MMMM D, YYYY')}</div>
                      <div className="text-sm text-gray-500">{date.reason}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No closed dates set
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save button */}
        {(activeTab === 'hours' || activeTab === 'rules') && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  Save Changes
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimplifiedSettings;
