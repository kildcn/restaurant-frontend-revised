// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Clock, Users, LogOut, Settings, Calendar, AlertCircle, CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, PlusCircle, Edit3 } from 'lucide-react';
import SimplifiedFloorPlan from './SimplifiedFloorPlan';
import SimplifiedSettings from './SimplifiedSettings';
import BookingModal from './BookingModal';
import apiService from '../services/api';
import moment from 'moment';

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('today');
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedTime, setSelectedTime] = useState(moment().format('HH:mm'));
  const [timeSlots, setTimeSlots] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [currentStats, setCurrentStats] = useState({
    totalBookings: 0,
    seatedCount: 0,
    upcomingCount: 0,
    occupancyRate: 0
  });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  useEffect(() => {
    fetchRestaurantInfo();
  }, []);

  useEffect(() => {
    if (restaurantInfo) {
      generateTimeSlots();
      fetchDashboardData();
    }
  }, [selectedDate, selectedTime, restaurantInfo]);

  useEffect(() => {
    // Auto-advance time every minute to keep current state updated
    const interval = setInterval(() => {
      if (moment(selectedTime, 'HH:mm').isSame(moment(), 'hour') &&
          moment(selectedTime, 'HH:mm').isSame(moment(), 'minute')) {
        setSelectedTime(moment().format('HH:mm'));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedTime]);

  const fetchRestaurantInfo = async () => {
    try {
      const response = await apiService.restaurant.getSettings();
      if (response.success) {
        setRestaurantInfo(response.settings);
        // Set current time to nearest 15-minute interval
        const currentMinutes = moment().minutes();
        const roundedMinutes = Math.floor(currentMinutes / 15) * 15;
        setSelectedTime(moment().minutes(roundedMinutes).format('HH:mm'));
      }
    } catch (error) {
      console.error('Error fetching restaurant info:', error);
    }
  };

  const generateTimeSlots = () => {
    if (!restaurantInfo) return;

    const dayOfWeek = moment(selectedDate).day();
    const daySettings = restaurantInfo.openingHours.find(h => h.day === dayOfWeek);

    if (!daySettings || daySettings.isClosed) {
      setTimeSlots([]);
      return;
    }

    const openTime = moment(selectedDate + ' ' + daySettings.open);
    const closeTime = moment(selectedDate + ' ' + daySettings.close);
    if (closeTime.isBefore(openTime)) {
      closeTime.add(1, 'day');
    }

    const slots = [];
    let currentSlot = moment(openTime);

    while (currentSlot.isSameOrBefore(closeTime)) {
      slots.push(currentSlot.format('HH:mm'));
      currentSlot.add(15, 'minutes');
    }

    setTimeSlots(slots);
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.bookings.getBookings(selectedDate, '', 1, 100);

      if (response.success) {
        const sortedBookings = response.data.sort((a, b) =>
          new Date(a.timeSlot.start) - new Date(b.timeSlot.start)
        );

        setBookings(sortedBookings);
        processBookingsForStats(sortedBookings);
        identifyAlerts(sortedBookings);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processBookingsForStats = (bookingsData) => {
    const selectedDateTime = moment(selectedDate + ' ' + selectedTime);

    const stats = {
      totalBookings: bookingsData.length,
      seatedCount: bookingsData.filter(b =>
        b.status === 'seated' &&
        moment(b.timeSlot.start).isSameOrBefore(selectedDateTime) &&
        moment(b.timeSlot.end).isAfter(selectedDateTime)
      ).length,
      upcomingCount: bookingsData.filter(b =>
        moment(b.timeSlot.start).isAfter(selectedDateTime) &&
        b.status === 'confirmed'
      ).length,
      occupancyRate: 0 // Would need table data to calculate properly
    };

    setCurrentStats(stats);
  };

  const identifyAlerts = (bookingsData) => {
    const selectedDateTime = moment(selectedDate + ' ' + selectedTime);
    const newAlerts = [];

    bookingsData.forEach(booking => {
      const startTime = moment(booking.timeSlot.start);
      const endTime = moment(booking.timeSlot.end);

      // Check if booking is relevant to selected time
      if (startTime.isSameOrBefore(selectedDateTime) && endTime.isAfter(selectedDateTime)) {
        const minutesLate = selectedDateTime.diff(startTime, 'minutes');

        if (minutesLate > 15 && booking.status === 'confirmed') {
          newAlerts.push({
            type: 'late',
            booking,
            message: `${booking.customer.name} is ${minutesLate} minutes late`
          });
        }
      }
    });

    setAlerts(newAlerts);
  };

  const updateBookingStatus = async (id, newStatus) => {
    try {
      const response = await apiService.bookings.updateBookingStatus(id, newStatus);
      if (response.success) {
        fetchDashboardData(); // Refresh data after update
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const handleCreateBooking = () => {
    setEditingBooking(null);
    setShowBookingModal(true);
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setShowBookingModal(true);
  };

  const handleSaveBooking = async (bookingData) => {
    try {
      if (editingBooking) {
        // Update existing booking
        const response = await apiService.bookings.updateBooking(editingBooking._id, bookingData);
        if (response.success) {
          fetchDashboardData();
          setShowBookingModal(false);
        }
      } else {
        // Create new booking
        const response = await apiService.bookings.createBooking(bookingData);
        if (response.success) {
          fetchDashboardData();
          setShowBookingModal(false);
        }
      }
    } catch (error) {
      console.error('Error saving booking:', error);
    }
  };

  const getStatusBadgeStyle = (status) => {
    const styles = {
      confirmed: 'bg-blue-100 text-blue-800',
      seated: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
      'no-show': 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getBookingsForTimeSlot = () => {
    if (!bookings || !selectedTime) return [];

    const selectedDateTime = moment(selectedDate + ' ' + selectedTime);

    return bookings.filter(booking => {
      const bookingStart = moment(booking.timeSlot.start);
      const bookingEnd = moment(booking.timeSlot.end);

      return bookingStart.isSameOrBefore(selectedDateTime) &&
             bookingEnd.isAfter(selectedDateTime);
    });
  };

  const navigateTimeSlot = (direction) => {
    const currentIndex = timeSlots.indexOf(selectedTime);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedTime(timeSlots[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < timeSlots.length - 1) {
      setSelectedTime(timeSlots[currentIndex + 1]);
    }
  };

  const handleNowClick = () => {
    setSelectedDate(moment().format('YYYY-MM-DD'));
    const currentMinutes = moment().minutes();
    const roundedMinutes = Math.floor(currentMinutes / 15) * 15;
    setSelectedTime(moment().minutes(roundedMinutes).format('HH:mm'));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">L'Eustache Admin</h1>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleCreateBooking}
                className="flex items-center px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                <PlusCircle size={18} className="mr-2" />
                New Booking
              </button>

              <div className="flex items-center bg-gray-100 rounded-md p-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm"
                />
              </div>

              <button
                onClick={fetchDashboardData}
                className="p-2 text-gray-500 hover:text-gray-700"
                title="Refresh data"
              >
                <RefreshCw size={20} />
              </button>

              <button
                onClick={onLogout}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut size={20} className="mr-1" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('today')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'today'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setActiveTab('floorplan')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'floorplan'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Floor Plan
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Time Selector - Always visible for Today and Floor Plan tabs */}
        {(activeTab === 'today' || activeTab === 'floorplan') && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-medium">Viewing Time</h3>
                <button
                  onClick={handleNowClick}
                  className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Now
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateTimeSlot('prev')}
                  disabled={timeSlots.indexOf(selectedTime) === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>

                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="text-lg font-medium border-0 focus:ring-2 focus:ring-primary rounded-md"
                >
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>
                      {moment(slot, 'HH:mm').format('h:mm A')}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => navigateTimeSlot('next')}
                  disabled={timeSlots.indexOf(selectedTime) === timeSlots.length - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {timeSlots.length === 0 && (
              <div className="mt-2 text-sm text-red-600">
                Restaurant is closed on selected date
              </div>
            )}
          </div>
        )}

        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex items-center">
                  <AlertCircle className="text-red-400 mr-3" size={20} />
                  <h3 className="text-red-800 font-medium">Attention Needed</h3>
                </div>
                <div className="mt-2 space-y-2">
                  {alerts.map((alert, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-red-700">{alert.message}</span>
                      <button
                        onClick={() => updateBookingStatus(alert.booking._id, 'no-show')}
                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                      >
                        Mark No-Show
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="text-blue-600" size={20} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="text-2xl font-semibold">{currentStats.totalBookings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="text-green-600" size={20} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Currently Seated</p>
                    <p className="text-2xl font-semibold">{currentStats.seatedCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="text-yellow-600" size={20} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Upcoming</p>
                    <p className="text-2xl font-semibold">{currentStats.upcomingCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CheckCircle className="text-purple-600" size={20} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Active at Selected Time</p>
                    <p className="text-2xl font-semibold">{getBookingsForTimeSlot().length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline View with Time Filter */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Bookings at {moment(selectedTime, 'HH:mm').format('h:mm A')}
                </h3>
              </div>
              <div className="px-4 py-5 sm:p-6">
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading bookings...</p>
                  </div>
                ) : getBookingsForTimeSlot().length > 0 ? (
                  <div className="space-y-4">
                    {getBookingsForTimeSlot().map((booking) => (
                      <div
                        key={booking._id}
                        className="flex items-center border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-24 text-center">
                          <div className="text-lg font-medium">
                            {moment(booking.timeSlot.start).format('h:mm A')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.partySize} guests
                          </div>
                        </div>

                        <div className="ml-4 flex-grow">
                          <div className="font-medium">{booking.customer.name}</div>
                          <div className="text-sm text-gray-500">{booking.customer.phone}</div>
                          {booking.tables && booking.tables.length > 0 && (
                            <div className="text-sm text-gray-500">
                              Tables: {booking.tables.map(t => t.tableNumber).join(', ')}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(booking.status)}`}>
                            {booking.status}
                          </span>
                          <button
                            onClick={() => handleEditBooking(booking)}
                            className="p-1 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100"
                          >
                            <Edit3 size={16} />
                          </button>
                          <select
                            value={booking.status}
                            onChange={(e) => updateBookingStatus(booking._id, e.target.value)}
                            className="text-sm border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="seated">Seated</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No Show</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No bookings at the selected time.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'floorplan' && (
          <SimplifiedFloorPlan
            date={selectedDate}
            selectedTime={selectedTime}
            bookings={bookings}
            updateBookingStatus={updateBookingStatus}
            onEditBooking={handleEditBooking}
          />
        )}

        {activeTab === 'settings' && (
          <SimplifiedSettings />
        )}
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          booking={editingBooking}
          restaurantInfo={restaurantInfo}
          defaultDate={selectedDate}
          defaultTime={selectedTime}
          onClose={() => setShowBookingModal(false)}
          onSave={handleSaveBooking}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
