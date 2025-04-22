// src/components/BookingModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, Users as UsersIcon, MessageSquare } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';

const BookingModal = ({ booking, restaurantInfo, defaultDate, defaultTime, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    partySize: 2,
    date: defaultDate || moment().format('YYYY-MM-DD'),
    time: defaultTime || '',
    duration: 120,
    specialRequests: '',
    status: 'confirmed',
    tables: []
  });
  const [availableTables, setAvailableTables] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (booking) {
      // Edit mode - populate form with existing booking data
      setFormData({
        customerName: booking.customer.name,
        customerEmail: booking.customer.email,
        customerPhone: booking.customer.phone,
        partySize: booking.partySize,
        date: moment(booking.date).format('YYYY-MM-DD'),
        time: moment(booking.timeSlot.start).format('HH:mm'),
        duration: booking.duration || 120,
        specialRequests: booking.specialRequests || '',
        status: booking.status,
        tables: booking.tables || []
      });
    }

    // Fetch available tables
    fetchAvailableTables();
  }, [booking]);

  const fetchAvailableTables = async () => {
    try {
      const response = await apiService.tables.getTables();
      if (response.success) {
        setAvailableTables(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTableSelection = (table) => {
    setFormData(prev => {
      const tableExists = prev.tables.some(t => t._id === table._id);

      if (tableExists) {
        // Remove table
        return {
          ...prev,
          tables: prev.tables.filter(t => t._id !== table._id)
        };
      } else {
        // Add table
        return {
          ...prev,
          tables: [...prev.tables, table]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validation
      if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) {
        setError('Please fill in all customer details');
        setIsLoading(false);
        return;
      }

      if (!formData.date || !formData.time) {
        setError('Please select both date and time');
        setIsLoading(false);
        return;
      }

      // Prepare booking data
      const bookingData = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        partySize: parseInt(formData.partySize),
        date: formData.date,
        time: formData.time,
        duration: parseInt(formData.duration),
        specialRequests: formData.specialRequests,
        status: formData.status,
        tables: formData.tables.map(t => t._id)
      };

      await onSave(bookingData);
    } catch (error) {
      console.error('Error saving booking:', error);
      setError('Failed to save booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate time slots based on restaurant hours
  const generateTimeSlots = () => {
    if (!restaurantInfo) return [];

    const dayOfWeek = moment(formData.date).day();
    const daySettings = restaurantInfo.openingHours.find(h => h.day === dayOfWeek);

    if (!daySettings || daySettings.isClosed) {
      return [];
    }

    const openTime = moment(formData.date + ' ' + daySettings.open);
    const closeTime = moment(formData.date + ' ' + daySettings.close);
    if (closeTime.isBefore(openTime)) {
      closeTime.add(1, 'day');
    }

    const slots = [];
    let currentSlot = moment(openTime);

    while (currentSlot.isSameOrBefore(closeTime.subtract(formData.duration, 'minutes'))) {
      slots.push(currentSlot.format('HH:mm'));
      currentSlot.add(15, 'minutes');
    }

    return slots;
  };

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

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
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
                    name="customerEmail"
                    value={formData.customerEmail}
                    onChange={handleChange}
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
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Party Size
                </label>
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    name="partySize"
                    value={formData.partySize}
                    onChange={handleChange}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                    required
                  >
                    <option value="">Select time</option>
                    {generateTimeSlots().map(slot => (
                      <option key={slot} value={slot}>
                        {moment(slot, 'HH:mm').format('h:mm A')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                >
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="150">2.5 hours</option>
                  <option value="180">3 hours</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
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

            {/* Table Selection */}
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
                      formData.tables.some(t => t._id === table._id)
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
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleChange}
                  rows="3"
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
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
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
