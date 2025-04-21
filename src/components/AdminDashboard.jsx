import React, { useState, useEffect } from 'react';
import { Clock, User, LogOut, Settings, List, Grid, Search, Mail, Download, FileText, Calendar, Filter, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock as ClockIcon, Users as UsersIcon } from 'lucide-react';
import FloorPlan from './FloorPlan';
import RestaurantSettings from './RestaurantSettings';
import apiService from '../services/api';
import moment from 'moment';

const AdminDashboard = ({ onLogout }) => {
  const [activeView, setActiveView] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeViewMode, setTimeViewMode] = useState('grid'); // 'grid' or 'list'
  const [statisticsData, setStatisticsData] = useState({
    total: 0,
    seated: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
    noShow: 0
  });

  useEffect(() => {
    // Set default date to today
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);

    // Fetch restaurant info
    const fetchRestaurantInfo = async () => {
      const response = await apiService.restaurant.getSettings();
      if (response.success) {
        setRestaurantInfo(response.settings);
      }
    };

    fetchRestaurantInfo();
  }, []);

  useEffect(() => {
    if (date) {
      fetchBookings();
    }
  }, [date, statusFilter, page]);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.bookings.getBookings(date, statusFilter !== 'all' ? statusFilter : '', page, 20);

      if (response.success) {
        // Sort bookings by start time
        const sortedBookings = response.data.sort((a, b) => {
          return new Date(a.timeSlot.start) - new Date(b.timeSlot.start);
        });

        setBookings(sortedBookings);
        setTotalPages(Math.ceil(response.count / 20));
        setTotalBookings(response.count);

        // Calculate statistics
        calculateStatistics(response.data);
      } else {
        console.error('Error fetching bookings:', response.error);
        setBookings([]);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    }

    setIsLoading(false);
  };

  const calculateStatistics = (bookingsData) => {
    const stats = {
      total: bookingsData.length,
      seated: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      noShow: 0
    };

    bookingsData.forEach(booking => {
      if (booking.status === 'seated') stats.seated++;
      else if (booking.status === 'confirmed') stats.confirmed++;
      else if (booking.status === 'pending') stats.pending++;
      else if (booking.status === 'cancelled') stats.cancelled++;
      else if (booking.status === 'no-show') stats.noShow++;
    });

    setStatisticsData(stats);
  };

  const generateTimeGrid = () => {
    if (!restaurantInfo || !bookings.length) return null;

    // Get opening hours for the selected date
    const dayOfWeek = new Date(date).getDay();
    const daySettings = restaurantInfo.openingHours.find(h => h.day === dayOfWeek);

    if (!daySettings || daySettings.isClosed) return <p className="text-center py-4">Restaurant is closed on this day.</p>;

    // Parse opening and closing times
    const openHour = parseInt(daySettings.open.split(':')[0]);
    const openMinute = parseInt(daySettings.open.split(':')[1]);
    const closeHour = parseInt(daySettings.close.split(':')[0]);
    const closeMinute = parseInt(daySettings.close.split(':')[1]);

    // Generate time slots (30-minute intervals)
    const timeSlots = [];
    let currentTime = new Date(date);
    currentTime.setHours(openHour, openMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(closeHour, closeMinute, 0, 0);

    // Handle case where closing is after midnight
    if (endTime < currentTime) {
      endTime.setDate(endTime.getDate() + 1);
    }

    while (currentTime < endTime) {
      timeSlots.push(new Date(currentTime));
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }

    // Map bookings to time slots
    return (
      <div className="bg-white shadow-lg rounded-lg overflow-auto mt-6 mb-8">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Schedule Overview</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeViewMode('grid')}
              className={`p-1 rounded ${timeViewMode === 'grid' ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setTimeViewMode('list')}
              className={`p-1 rounded ${timeViewMode === 'list' ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {timeViewMode === 'grid' ? (
          <div className="overflow-x-auto p-4">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-2 border-b-2 border-r bg-gray-50 sticky left-0 z-10">Time</th>
                  {bookings
                    .filter(b => b.tables && b.tables.length > 0)
                    .flatMap(b => b.tables)
                    .filter((table, index, self) =>
                      self.findIndex(t => t._id === table._id) === index
                    )
                    .sort((a, b) => {
                      const aNum = parseInt(a.tableNumber.replace(/\D/g, '')) || 0;
                      const bNum = parseInt(b.tableNumber.replace(/\D/g, '')) || 0;
                      return aNum - bNum;
                    })
                    .map(table => (
                      <th key={table._id} className="p-2 border-b-2 text-center min-w-[120px]">
                        <div className="font-medium">Table {table.tableNumber}</div>
                        <div className="text-xs text-gray-500">{table.capacity} seats</div>
                      </th>
                    ))
                  }
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, idx) => {
                  const timeStr = slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-2 border-r font-medium sticky left-0 z-10" style={{ backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                        {timeStr}
                      </td>

                      {bookings
                        .filter(b => b.tables && b.tables.length > 0)
                        .flatMap(b => b.tables)
                        .filter((table, index, self) =>
                          self.findIndex(t => t._id === table._id) === index
                        )
                        .sort((a, b) => {
                          const aNum = parseInt(a.tableNumber.replace(/\D/g, '')) || 0;
                          const bNum = parseInt(b.tableNumber.replace(/\D/g, '')) || 0;
                          return aNum - bNum;
                        })
                        .map(table => {
                          // Find bookings for this table at this time slot
                          const bookingsAtTime = bookings.filter(booking => {
                            if (!booking.tables) return false;

                            const startTime = new Date(booking.timeSlot.start);
                            const endTime = new Date(booking.timeSlot.end);
                            const isForThisTable = booking.tables.some(t => t._id === table._id);

                            return isForThisTable && startTime <= slot && endTime > slot;
                          });

                          if (bookingsAtTime.length === 0) {
                            return <td key={table._id} className="border p-2"></td>;
                          }

                          const booking = bookingsAtTime[0];
                          const startTime = new Date(booking.timeSlot.start);
                          const isStart = moment(startTime).format('HH:mm') === moment(slot).format('HH:mm');

                          // Style based on booking status
                          let statusClass = '';
                          switch(booking.status) {
                            case 'confirmed': statusClass = 'bg-blue-100 text-blue-800 border-blue-300'; break;
                            case 'seated': statusClass = 'bg-green-100 text-green-800 border-green-300'; break;
                            case 'pending': statusClass = 'bg-yellow-100 text-yellow-800 border-yellow-300'; break;
                            case 'cancelled': statusClass = 'bg-red-100 text-red-800 border-red-300'; break;
                            case 'no-show': statusClass = 'bg-gray-100 text-gray-800 border-gray-300'; break;
                            default: statusClass = 'bg-purple-100 text-purple-800 border-purple-300';
                          }

                          return (
                            <td key={table._id} className={`border p-1 ${statusClass}`}>
                              {isStart ? (
                                <div className="text-xs">
                                  <div className="font-medium">{booking.customer.name}</div>
                                  <div>{booking.partySize} guests</div>
                                  <div>{formatTime(booking.timeSlot.start)}</div>
                                </div>
                              ) : (
                                <div className="h-5 border-t border-dashed border-current opacity-50"></div>
                              )}
                            </td>
                          );
                        })
                      }
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-auto p-4">
            <div className="space-y-4">
              {timeSlots.map((slot, idx) => {
                const timeStr = slot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const bookingsAtTime = bookings.filter(booking => {
                  const startTime = new Date(booking.timeSlot.start);
                  const endTime = new Date(booking.timeSlot.end);
                  return startTime <= slot && endTime > slot;
                });

                return (
                  <div key={idx} className={`p-3 rounded-lg ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="font-medium text-lg mb-2 flex items-center">
                      <Clock className="mr-2 text-primary" size={18} />
                      {timeStr}
                      <span className="ml-2 text-sm text-gray-500">
                        ({bookingsAtTime.length} {bookingsAtTime.length === 1 ? 'booking' : 'bookings'})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {bookingsAtTime.length > 0 ? (
                        bookingsAtTime.map(booking => {
                          let statusClass = '';
                          switch(booking.status) {
                            case 'confirmed': statusClass = 'bg-blue-100 text-blue-800 border-blue-300'; break;
                            case 'seated': statusClass = 'bg-green-100 text-green-800 border-green-300'; break;
                            case 'pending': statusClass = 'bg-yellow-100 text-yellow-800 border-yellow-300'; break;
                            case 'cancelled': statusClass = 'bg-red-100 text-red-800 border-red-300'; break;
                            case 'no-show': statusClass = 'bg-gray-100 text-gray-800 border-gray-300'; break;
                            default: statusClass = 'bg-purple-100 text-purple-800 border-purple-300';
                          }

                          return (
                            <div key={booking._id} className={`p-2 rounded border ${statusClass} flex justify-between`}>
                              <div>
                                <div className="font-medium">{booking.customer.name}</div>
                                <div className="text-xs">{booking.partySize} guests • {formatTime(booking.timeSlot.start)} - {formatTime(booking.timeSlot.end)}</div>
                              </div>
                              <div className="text-xs">
                                {booking.tables && booking.tables.map(table => (
                                  <span key={table._id} className="ml-1 inline-block px-1 bg-white rounded">
                                    {table.tableNumber}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-full text-sm text-gray-500 text-center py-1">
                          No bookings at this time
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const updateBookingStatus = async (id, newStatus) => {
    try {
      const response = await apiService.bookings.updateBookingStatus(id, newStatus);

      if (response.success) {
        // Update local state
        setBookings(bookings.map(booking =>
          booking._id === id ? { ...booking, status: newStatus } : booking
        ));
      } else {
        console.error('Error updating booking status:', response.error);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'seated':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter bookings based on search term
  const filteredBookings = bookings.filter(booking => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      booking.customer.name.toLowerCase().includes(searchLower) ||
      booking.customer.email.toLowerCase().includes(searchLower) ||
      booking.customer.phone.includes(searchTerm) ||
      (booking.tables && booking.tables.some(t => t.tableNumber?.toLowerCase().includes(searchLower)))
    );
  });

  // Format time for display (18:00 -> 6:00 PM)
  const formatTime = (isoTime) => {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Export bookings to CSV
  const exportBookings = () => {
    // Header row
    let csv = 'Date,Time,End Time,Customer Name,Email,Phone,Party Size,Tables,Status,Special Requests\n';

    // Add rows
    bookings.forEach(booking => {
      const row = [
        moment(booking.date).format('YYYY-MM-DD'),
        formatTime(booking.timeSlot.start),
        formatTime(booking.timeSlot.end),
        `"${booking.customer.name}"`,
        `"${booking.customer.email}"`,
        `"${booking.customer.phone}"`,
        booking.partySize,
        booking.tables.map(t => t.tableNumber).join(' & '),
        booking.status,
        `"${booking.specialRequests || ''}"`
      ];

      csv += row.join(',') + '\n';
    });

    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bookings-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold">L'Eustache</h1>
          <p className="text-gray-400 text-sm">Admin Dashboard</p>
        </div>

        <nav className="p-4">
          <button
            onClick={() => setActiveView('bookings')}
            className={`flex items-center w-full mb-4 p-3 rounded-md transition-colors ${
              activeView === 'bookings'
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <List className="mr-3" size={18} />
            <span>Bookings</span>
          </button>

          <button
            onClick={() => setActiveView('floorplan')}
            className={`flex items-center w-full mb-4 p-3 rounded-md transition-colors ${
              activeView === 'floorplan'
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Grid className="mr-3" size={18} />
            <span>Floor Plan</span>
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`flex items-center w-full mb-4 p-3 rounded-md transition-colors ${
              activeView === 'settings'
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Settings className="mr-3" size={18} />
            <span>Settings</span>
          </button>

          <button
            onClick={() => setActiveView('emails')}
            className={`flex items-center w-full mb-4 p-3 rounded-md transition-colors ${
              activeView === 'emails'
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Mail className="mr-3" size={18} />
            <span>Email Templates</span>
          </button>

          <button
            onClick={() => setActiveView('reports')}
            className={`flex items-center w-full mb-4 p-3 rounded-md transition-colors ${
              activeView === 'reports'
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <FileText className="mr-3" size={18} />
            <span>Reports</span>
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-gray-800">
          <button
            onClick={onLogout}
            className="flex items-center w-full p-3 rounded-md text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <LogOut className="mr-3" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-semibold text-gray-800">
              {activeView === 'bookings' && 'Manage Bookings'}
              {activeView === 'floorplan' && 'Floor Plan'}
              {activeView === 'settings' && 'Restaurant Settings'}
              {activeView === 'emails' && 'Email Templates'}
              {activeView === 'reports' && 'Reports & Analytics'}
            </h2>

            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <Calendar className="mr-2 text-primary" size={20} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="text-sm text-gray-600 font-medium">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {activeView === 'bookings' && (
            <div>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-gray-500 text-sm">Total Bookings</h4>
                    <span className="bg-blue-50 text-blue-600 p-1 rounded">
                      <User size={16} />
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{statisticsData.total}</div>
                  <div className="text-xs text-gray-500">For {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-gray-500 text-sm">Confirmed</h4>
                    <span className="bg-blue-50 text-blue-600 p-1 rounded">
                      <CheckCircle size={16} />
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{statisticsData.confirmed}</div>
                  <div className="text-xs text-gray-500">{((statisticsData.confirmed / statisticsData.total) * 100 || 0).toFixed(0)}% of bookings</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-gray-500 text-sm">Seated</h4>
                    <span className="bg-green-50 text-green-600 p-1 rounded">
                      <UsersIcon size={16} />
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{statisticsData.seated}</div>
                  <div className="text-xs text-gray-500">{((statisticsData.seated / statisticsData.total) * 100 || 0).toFixed(0)}% of bookings</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-gray-500 text-sm">Pending</h4>
                    <span className="bg-yellow-50 text-yellow-600 p-1 rounded">
                      <ClockIcon size={16} />
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{statisticsData.pending}</div>
                  <div className="text-xs text-gray-500">{((statisticsData.pending / statisticsData.total) * 100 || 0).toFixed(0)}% of bookings</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-gray-500 text-sm">Cancelled</h4>
                    <span className="bg-red-50 text-red-600 p-1 rounded">
                      <XCircle size={16} />
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{statisticsData.cancelled}</div>
                  <div className="text-xs text-gray-500">{((statisticsData.cancelled / statisticsData.total) * 100 || 0).toFixed(0)}% of bookings</div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-gray-500 text-sm">No Show</h4>
                    <span className="bg-gray-50 text-gray-600 p-1 rounded">
                      <AlertTriangle size={16} />
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{statisticsData.noShow}</div>
                  <div className="text-xs text-gray-500">{((statisticsData.noShow / statisticsData.total) * 100 || 0).toFixed(0)}% of bookings</div>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="seated">Seated</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>

                  <div className="text-sm font-medium">
                    {searchTerm ? filteredBookings.length : totalBookings} booking{(searchTerm ? filteredBookings.length : totalBookings) !== 1 ? 's' : ''}
                  </div>

                  <button
                    onClick={exportBookings}
                    className="flex items-center px-3 py-2 text-sm bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                    disabled={bookings.length === 0}
                  >
                    <Download size={16} className="mr-1" />
                    Export CSV
                  </button>

                  <button
                    onClick={fetchBookings}
                    className="flex items-center px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw size={16} className="mr-1" />
                    Refresh
                  </button>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 p-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              {/* Time Grid View */}
              {generateTimeGrid()}

              {/* Bookings Table */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2">Loading bookings...</p>
                </div>
              ) : filteredBookings.length > 0 ? (
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Party
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tables
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBookings.map((booking) => (
                        <tr key={booking._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{booking.customer.name}</div>
                            <div className="text-sm text-gray-500">{booking.customer.email}</div>
                            <div className="text-sm text-gray-500">{booking.customer.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {formatTime(booking.timeSlot.start)}
                            </div>
                            <div className="text-sm text-gray-500">
                              to {formatTime(booking.timeSlot.end)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {booking.tables && booking.tables.length > 0
                                ? booking.tables.map(t => t.tableNumber).join(', ')
                                : <span className="text-yellow-500">Unassigned</span>
                              }
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyle(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <select
                              value={booking.status}
                              onChange={(e) => updateBookingStatus(booking._id, e.target.value)}
                              className="p-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirm</option>
                              <option value="seated">Seat</option>
                              <option value="completed">Complete</option>
                              <option value="cancelled">Cancel</option>
                              <option value="no-show">No Show</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {!searchTerm && totalPages > 1 && (
                    <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
                      <div className="text-sm text-gray-500">
                        Showing page {page} of {totalPages}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                          className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-white shadow-lg rounded-lg">
                  <p className="text-gray-500">No bookings found for the selected date and filters.</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'floorplan' && (
            <div>
              <div className="bg-white shadow-lg rounded-lg p-6">
                <FloorPlan
                  date={date}
                  bookings={bookings}
                  updateBookingStatus={updateBookingStatus}
                />
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <RestaurantSettings />
          )}

          {activeView === 'emails' && (
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Email Templates</h3>
              <p className="text-gray-500 mb-6">
                Customize the email templates sent to customers. This functionality will be implemented soon.
              </p>

              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Booking Confirmation Email</h4>
                <p className="text-sm text-gray-600">Sent immediately after a booking is made.</p>
                <button className="mt-2 px-3 py-1 text-sm bg-primary text-white rounded">Edit Template</button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium mb-2">Booking Reminder Email</h4>
                <p className="text-sm text-gray-600">Sent 24 hours before the reservation.</p>
                <button className="mt-2 px-3 py-1 text-sm bg-primary text-white rounded">Edit Template</button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">Post-Dining Feedback Email</h4>
                <p className="text-sm text-gray-600">Sent after the guest's visit to collect feedback.</p>
                <button className="mt-2 px-3 py-1 text-sm bg-primary text-white rounded">Edit Template</button>
              </div>
            </div>
          )}

          {activeView === 'reports' && (
            <div className="bg-white shadow-lg rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Reports & Analytics</h3>
              <p className="text-gray-500 mb-6">
                View booking statistics and analytics. This functionality will be implemented soon.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Today's Summary</h4>
                  <div className="text-2xl font-bold">{statisticsData.total - statisticsData.cancelled - statisticsData.noShow}</div>
                  <p className="text-sm text-gray-600">Active bookings</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">This Week</h4>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-sm text-gray-600">Total bookings</p>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-2">This Month</h4>
                  <div className="text-2xl font-bold">--</div>
                  <p className="text-sm text-gray-600">Total bookings</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-3">Generate Report</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">From Date</label>
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">To Date</label>
                    <input
                      type="date"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Report Type</label>
                    <select className="w-full p-2 border border-gray-300 rounded">
                      <option>Bookings Summary</option>
                      <option>Customer Statistics</option>
                      <option>Table Utilization</option>
                    </select>
                  </div>
                </div>

                <button className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors flex items-center">
                  <Download size={16} className="mr-2" />
                  Generate Report
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
