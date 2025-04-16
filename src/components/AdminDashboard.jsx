import React, { useState, useEffect } from 'react';
import { Calendar, Clock, LogOut, User, Settings, List, Grid, Search, Mail, Download, FileText } from 'lucide-react';
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
      const response = await apiService.bookings.getBookings(date, statusFilter !== 'all' ? statusFilter : '', page, 10);

      if (response.success) {
        setBookings(response.data);
        setTotalPages(Math.ceil(response.count / 10));
        setTotalBookings(response.count);
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

              {/* Bookings Table */}
              {isLoading ? (
                <div className="text-center py-12">Loading bookings...</div>
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
                              {booking.tables.map(t => t.tableNumber).join(', ')}
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
                  <div className="text-2xl font-bold">{bookings.filter(b => b.status !== 'cancelled' && b.status !== 'no-show').length}</div>
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
