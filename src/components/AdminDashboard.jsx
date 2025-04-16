import React, { useState, useEffect } from 'react';
import { Calendar, Clock, LogOut, User, Settings, List, Grid, Search } from 'lucide-react';
import FloorPlan from './FloorPlan';

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Set default date to today
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (date) {
      fetchBookings();
    }
  }, [date, statusFilter]);

  const fetchBookings = async () => {
    setIsLoading(true);
    // This would fetch from your API in a real implementation
    // Simulating API call
    setTimeout(() => {
      // Mock bookings data
      const mockBookings = [
        {
          id: '1',
          customer: { name: 'Jean Dupont', email: 'jean@example.com', phone: '0123456789' },
          date: date,
          timeSlot: { start: `${date}T18:00:00`, end: `${date}T20:00:00` },
          partySize: 2,
          tables: [{ id: 'A1', tableNumber: 'A1' }],
          status: 'confirmed',
          specialRequests: 'Window seat if possible'
        },
        {
          id: '2',
          customer: { name: 'Marie Laurent', email: 'marie@example.com', phone: '0123456789' },
          date: date,
          timeSlot: { start: `${date}T19:30:00`, end: `${date}T21:30:00` },
          partySize: 4,
          tables: [{ id: 'A3', tableNumber: 'A3' }],
          status: 'pending',
          specialRequests: ''
        },
        {
          id: '3',
          customer: { name: 'Thomas Bernard', email: 'thomas@example.com', phone: '0123456789' },
          date: date,
          timeSlot: { start: `${date}T20:30:00`, end: `${date}T22:30:00` },
          partySize: 6,
          tables: [{ id: 'A6', tableNumber: 'A6' }, { id: 'A7', tableNumber: 'A7' }],
          status: 'seated',
          specialRequests: 'Birthday celebration'
        },
        {
          id: '4',
          customer: { name: 'Sophie Martin', email: 'sophie@example.com', phone: '0123456789' },
          date: date,
          timeSlot: { start: `${date}T18:30:00`, end: `${date}T20:30:00` },
          partySize: 2,
          tables: [{ id: 'B1', tableNumber: 'B1' }],
          status: 'completed',
          specialRequests: ''
        },
        {
          id: '5',
          customer: { name: 'Pierre Michel', email: 'pierre@example.com', phone: '0123456789' },
          date: date,
          timeSlot: { start: `${date}T21:00:00`, end: `${date}T23:00:00` },
          partySize: 3,
          tables: [{ id: 'A4', tableNumber: 'A4' }],
          status: 'cancelled',
          specialRequests: ''
        }
      ];

      setBookings(mockBookings);
      setIsLoading(false);
    }, 600);
  };

  const updateBookingStatus = (id, newStatus) => {
    // In a real app, this would make an API call
    setBookings(bookings.map(booking =>
      booking.id === id ? { ...booking, status: newStatus } : booking
    ));
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

  // Filter bookings based on search term and status filter
  const filteredBookings = bookings.filter(booking => {
    // Filter by status
    if (statusFilter !== 'all' && booking.status !== statusFilter) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        booking.customer.name.toLowerCase().includes(searchLower) ||
        booking.customer.email.toLowerCase().includes(searchLower) ||
        booking.customer.phone.includes(searchTerm) ||
        booking.tables.some(t => t.tableNumber.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Format time for display (18:00 -> 6:00 PM)
  const formatTime = (isoTime) => {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">L'Eustache</h1>
          <p className="text-gray-400 text-sm">Admin Dashboard</p>
        </div>

        <nav className="p-4">
          <button
            onClick={() => setActiveView('bookings')}
            className={`flex items-center w-full mb-4 p-2 rounded-md ${activeView === 'bookings' ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
          >
            <List className="mr-2" size={18} />
            <span>Bookings</span>
          </button>

          <button
            onClick={() => setActiveView('floorplan')}
            className={`flex items-center w-full mb-4 p-2 rounded-md ${activeView === 'floorplan' ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
          >
            <Grid className="mr-2" size={18} />
            <span>Floor Plan</span>
          </button>

          <button
            onClick={() => setActiveView('settings')}
            className={`flex items-center w-full mb-4 p-2 rounded-md ${activeView === 'settings' ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
          >
            <Settings className="mr-2" size={18} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="p-4 mt-auto border-t border-gray-800">
          <button className="flex items-center w-full p-2 rounded-md hover:bg-gray-800">
            <LogOut className="mr-2" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {activeView === 'bookings' && 'Manage Bookings'}
              {activeView === 'floorplan' && 'Floor Plan'}
              {activeView === 'settings' && 'Settings'}
            </h2>

            <div className="flex items-center">
              <div className="flex items-center mr-4">
                <Calendar className="mr-2" size={18} />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="text-sm text-gray-600">
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
                <div className="flex items-center space-x-4">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="seated">Seated</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>

                  <div className="text-sm">
                    {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 p-2 w-full border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Bookings Table */}
              {isLoading ? (
                <div className="text-center py-12">Loading bookings...</div>
              ) : filteredBookings.length > 0 ? (
                <div className="bg-white shadow rounded-lg overflow-hidden">
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
                        <tr key={booking.id} className="hover:bg-gray-50">
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
                              onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                              className="p-1 border border-gray-300 rounded-md text-sm"
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
                </div>
              ) : (
                <div className="text-center py-12 bg-white shadow rounded-lg">
                  <p className="text-gray-500">No bookings found for the selected date and filters.</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'floorplan' && (
            <div>
              <div className="bg-white shadow rounded-lg p-6">
                <FloorPlan
                  date={date}
                  bookings={bookings}
                  updateBookingStatus={updateBookingStatus}
                />
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Restaurant Settings</h3>
              <p className="text-gray-500">Settings functionality would be implemented here.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
