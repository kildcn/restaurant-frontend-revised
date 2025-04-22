// src/components/SimplifiedFloorPlan.jsx
import React, { useState, useEffect } from 'react';
import { Clock, User, Mail, Phone, AlertCircle, Info, Edit3, Plus, Users } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';

const SimplifiedFloorPlan = ({ date, selectedTime, bookings, updateBookingStatus, onEditBooking }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [draggedBooking, setDraggedBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredBooking, setHoveredBooking] = useState(null);
  const [dragOverTable, setDragOverTable] = useState(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.tables.getTables();
      if (response.success) {
        const positionedTables = assignTablePositions(response.data || []);
        setTables(positionedTables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const assignTablePositions = (tableData) => {
    // Enhanced positioning logic with better spacing and organization
    const tablesWithPositions = [];

    // Define sections with improved layout
    const sections = {
      indoor: { x: 40, y: 80, rows: 3, cols: 4, spacing: 90 },
      outdoor: { x: 40, y: 360, rows: 2, cols: 4, spacing: 90 },
      bar: { x: 600, y: 80, rows: 3, cols: 2, spacing: 90 },
      window: { x: 40, y: 240, rows: 1, cols: 4, spacing: 90 }
    };

    // Group tables by section
    const sectionGroups = {
      indoor: [],
      outdoor: [],
      bar: [],
      window: [],
      other: []
    };

    tableData.forEach(table => {
      const section = table.section || 'indoor';
      if (sectionGroups[section]) {
        sectionGroups[section].push(table);
      } else {
        sectionGroups.other.push(table);
      }
    });

    // Position tables within each section
    Object.entries(sectionGroups).forEach(([sectionName, sectionTables]) => {
      if (sectionTables.length === 0) return;

      const sectionConfig = sections[sectionName] || sections.indoor;
      sectionTables.forEach((table, index) => {
        const row = Math.floor(index / sectionConfig.cols);
        const col = index % sectionConfig.cols;

        // Calculate size based on capacity
        const size = table.capacity <= 2 ? 60 : table.capacity <= 4 ? 70 : 80;

        const position = {
          x: sectionConfig.x + col * sectionConfig.spacing,
          y: sectionConfig.y + row * sectionConfig.spacing,
          width: size,
          height: size,
          shape: table.capacity > 4 ? 'rect' : 'round'
        };

        tablesWithPositions.push({
          ...table,
          ...position
        });
      });
    });

    return tablesWithPositions;
  };

  // Generate unique color for each booking
  const getBookingColor = (bookingId) => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#F97316', // orange
      '#6366F1', // indigo
      '#14B8A6'  // teal
    ];

    // Use the booking ID to consistently generate the same color
    const index = bookingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const getTableStatus = (table) => {
    const selectedDateTime = moment(date + ' ' + selectedTime);

    const booking = bookings.find(b =>
      b.tables?.some(t => t._id === table._id) &&
      b.status !== 'cancelled' &&
      b.status !== 'no-show' &&
      moment(b.timeSlot.start).isSameOrBefore(selectedDateTime) &&
      moment(b.timeSlot.end).isAfter(selectedDateTime)
    );

    if (!booking) return { status: 'available', color: '#E5E7EB' };

    return {
      status: booking.status,
      color: getBookingColor(booking._id),
      booking,
      isGrouped: booking.tables.length > 1
    };
  };

  const getBookingTables = (booking) => {
    return tables.filter(table =>
      booking.tables?.some(t => t._id === table._id)
    );
  };

  const getUnassignedBookings = () => {
    const selectedDateTime = moment(date + ' ' + selectedTime);

    return bookings.filter(booking => {
      const bookingStart = moment(booking.timeSlot.start);
      const bookingEnd = moment(booking.timeSlot.end);

      return (!booking.tables || booking.tables.length === 0) &&
             booking.status !== 'cancelled' &&
             booking.status !== 'no-show' &&
             booking.status !== 'completed' &&
             bookingStart.isSameOrBefore(selectedDateTime) &&
             bookingEnd.isAfter(selectedDateTime);
    });
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
  };

  const handleDragStart = (booking, e) => {
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', booking._id);
  };

  const handleTableDragOver = (table, e) => {
    e.preventDefault();

    // Only allow drop on indoor tables for customer bookings unless draggedBooking is an admin booking
    if (draggedBooking && !draggedBooking.isAdminBooking && table.section === 'outdoor') {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    setDragOverTable(table._id);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTableDragLeave = () => {
    setDragOverTable(null);
  };

  const handleTableDrop = async (table, e) => {
    e.preventDefault();
    setDragOverTable(null);

    if (!draggedBooking) return;

    // Prevent dropping customer bookings on outdoor tables
    if (!draggedBooking.isAdminBooking && table.section === 'outdoor') {
      alert('Customer bookings can only be assigned to indoor tables.');
      return;
    }

    // Check table capacity
    if (table.capacity < draggedBooking.partySize) {
      alert(`Table capacity (${table.capacity}) is less than party size (${draggedBooking.partySize}).`);
      return;
    }

    try {
      const response = await apiService.bookings.updateBooking(draggedBooking._id, {
        tables: [table._id]
      });

      if (response.success) {
        // Refresh data
        updateBookingStatus(draggedBooking._id, draggedBooking.status);
      }
    } catch (error) {
      console.error('Error assigning table:', error);
      alert('Failed to assign table. Please try again.');
    }

    setDraggedBooking(null);
  };

  const formatTime = (time) => {
    return moment(time).format('h:mm A');
  };

  // Render connections between tables in the same booking
  const renderTableConnections = () => {
    const connections = [];

    bookings.forEach(booking => {
      if (booking.tables && booking.tables.length > 1 && booking.status !== 'cancelled' && booking.status !== 'no-show') {
        const bookingTables = getBookingTables(booking);

        // Sort tables by position to ensure consistent connection direction
        bookingTables.sort((a, b) => {
          if (Math.abs(a.y - b.y) < 20) {
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        // Connect adjacent tables
        for (let i = 0; i < bookingTables.length - 1; i++) {
          const table1 = bookingTables[i];
          const table2 = bookingTables[i + 1];

          const distance = Math.sqrt(
            Math.pow(table2.x - table1.x, 2) +
            Math.pow(table2.y - table1.y, 2)
          );

          // Only connect tables that are close to each other
          if (distance < 150) {
            const x1 = table1.x + table1.width / 2;
            const y1 = table1.y + table1.height / 2;
            const x2 = table2.x + table2.width / 2;
            const y2 = table2.y + table2.height / 2;

            connections.push(
              <line
                key={`${booking._id}-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={getBookingColor(booking._id)}
                strokeWidth="3"
                strokeDasharray="5,5"
                opacity={hoveredBooking === booking._id ? 1 : 0.3}
              />
            );
          }
        }
      }
    });

    return connections;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Floor Plan */}
      <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Floor Plan</h3>
          <div className="flex items-center text-sm text-gray-500">
            <Clock size={16} className="mr-1" />
            Viewing: {moment(selectedTime, 'HH:mm').format('h:mm A')}
          </div>
        </div>

        <div className="relative w-full h-[600px] border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
          {/* Section Labels */}
          <div className="absolute top-4 left-4 bg-blue-100 px-3 py-1 rounded text-sm font-medium z-10">
            Indoor
          </div>
          <div className="absolute top-[340px] left-4 bg-green-100 px-3 py-1 rounded text-sm font-medium z-10">
            Outdoor
          </div>
          <div className="absolute top-4 right-[120px] bg-yellow-100 px-3 py-1 rounded text-sm font-medium z-10">
            Bar
          </div>
          <div className="absolute top-[220px] left-4 bg-purple-100 px-3 py-1 rounded text-sm font-medium z-10">
            Window
          </div>

          {/* Table Connections SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {renderTableConnections()}
          </svg>

          {/* Tables */}
          {tables.map(table => {
            const { status, color, booking, isGrouped } = getTableStatus(table);
            const isSelected = selectedTable?._id === table._id;
            const isDragOver = dragOverTable === table._id;

            // Check if table is available for current dragging booking
            const canAcceptDrop = draggedBooking &&
              (draggedBooking.isAdminBooking || table.section !== 'outdoor') &&
              table.capacity >= draggedBooking.partySize;

            return (
              <div
                key={table._id}
                className={`absolute flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                } ${isDragOver && canAcceptDrop ? 'ring-2 ring-green-500' : ''} ${
                  isDragOver && !canAcceptDrop ? 'ring-2 ring-red-500' : ''
                }`}
                style={{
                  left: `${table.x}px`,
                  top: `${table.y}px`,
                  width: `${table.width}px`,
                  height: `${table.height}px`,
                  backgroundColor: status === 'available' ? '#f3f4f6' : 'transparent',
                  borderRadius: table.shape === 'round' ? '50%' : '8px',
                  boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: status !== 'available' ? `3px solid ${color}` : '1px solid #e5e7eb',
                  background: status !== 'available' ? `${color}20` : '#f3f4f6',
                  transform: isDragOver ? 'scale(1.05)' : 'scale(1)'
                }}
                onClick={() => handleTableClick(table)}
                onDragOver={(e) => handleTableDragOver(table, e)}
                onDragLeave={handleTableDragLeave}
                onDrop={(e) => handleTableDrop(table, e)}
                onMouseEnter={() => booking && setHoveredBooking(booking._id)}
                onMouseLeave={() => setHoveredBooking(null)}
              >
                <div className={`text-center font-medium ${status === 'available' ? 'text-gray-600' : 'text-gray-900'}`}>
                  <div className="text-lg">{table.tableNumber}</div>
                  <div className="text-xs text-gray-500">{table.capacity} seats</div>
                  {booking && (
                    <div className="text-xs mt-0.5 font-normal">{booking.partySize} guests</div>
                  )}
                </div>

                {/* Table section indicator */}
                <div className={`absolute -bottom-2 px-2 py-0.5 text-xs rounded-full ${
                  table.section === 'outdoor' ? 'bg-green-100 text-green-800' :
                  table.section === 'bar' ? 'bg-yellow-100 text-yellow-800' :
                  table.section === 'window' ? 'bg-purple-100 text-purple-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {table.section || 'indoor'}
                </div>

                {/* Hover tooltip */}
                {booking && hoveredBooking === booking._id && (
                  <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-white rounded-lg p-3 shadow-lg text-black text-sm z-50 w-64">
                    <div className="font-bold text-base mb-1">{booking.customer.name}</div>
                    <div className="text-xs text-gray-600 mb-1">
                      <Phone className="inline-block w-3 h-3 mr-1" />{booking.customer.phone}
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      <Clock className="inline-block w-3 h-3 mr-1" />{formatTime(booking.timeSlot.start)} - {formatTime(booking.timeSlot.end)}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      <Users className="inline-block w-3 h-3 mr-1" />{booking.partySize} guests
                    </div>
                    {booking.specialRequests && (
                      <div className="text-xs text-gray-600 italic mb-2">
                        "{booking.specialRequests}"
                      </div>
                    )}
                    <div className="mt-1 text-xs capitalize px-2 py-1 rounded inline-block" style={{ backgroundColor: color + '20', color: color }}>
                      {booking.status}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300 mr-2"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F620', border: '3px solid #3B82F6' }}></div>
            <span className="ml-2">Occupied</span>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-0.5 mr-2" style={{ backgroundColor: '#3B82F6', borderTop: '2px dashed #3B82F6' }}></div>
            <span>Grouped Tables</span>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="lg:col-span-1 space-y-6">
        {/* Unassigned Bookings */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-medium mb-3">Unassigned Bookings</h4>
          <div className="space-y-2">
            {getUnassignedBookings().length > 0 ? (
              getUnassignedBookings().map(booking => (
                <div
                  key={booking._id}
                  className="p-3 bg-gray-50 rounded border border-gray-200 cursor-move hover:bg-gray-100 transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(booking, e)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{booking.customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {booking.partySize} guests • {formatTime(booking.timeSlot.start)}
                      </div>
                      {!booking.isAdminBooking && (
                        <div className="text-xs text-blue-600 mt-1">
                          <Info className="inline-block w-3 h-3 mr-1" />
                          Indoor tables only
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onEditBooking(booking)}
                      className="p-1 text-gray-500 hover:text-primary rounded-full hover:bg-gray-200"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                All bookings assigned at this time
              </div>
            )}
          </div>
        </div>

        {/* Selected Table Details */}
        {selectedTable && (
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-medium mb-3">Table {selectedTable.tableNumber}</h4>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-gray-500">Capacity:</span> {selectedTable.capacity} guests
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Section:</span> {selectedTable.section || 'Indoor'}
              </div>

              {selectedTable.section === 'outdoor' && (
                <div className="text-sm bg-yellow-50 p-2 rounded">
                  <AlertCircle className="inline-block w-4 h-4 text-yellow-600 mr-1" />
                  <span className="text-yellow-700">Outdoor table - Admin only</span>
                </div>
              )}

              {getTableStatus(selectedTable).booking ? (
                <div className="border-t pt-3">
                  <div className="font-medium">Booking Details</div>
                  <div className="mt-2 space-y-2">
                    <div className="text-sm">
                      <span className="text-gray-500">Name:</span> {getTableStatus(selectedTable).booking.customer.name}
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Time:</span> {formatTime(getTableStatus(selectedTable).booking.timeSlot.start)} - {formatTime(getTableStatus(selectedTable).booking.timeSlot.end)}
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Guests:</span> {getTableStatus(selectedTable).booking.partySize}
                    </div>

                    {getTableStatus(selectedTable).isGrouped && (
                      <div className="text-sm">
                        <span className="text-gray-500">Grouped with:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {getTableStatus(selectedTable).booking.tables
                            .filter(t => t._id !== selectedTable._id)
                            .map(t => (
                              <span key={t._id} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                Table {t.tableNumber}
                              </span>
                            ))
                          }
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <button
                        onClick={() => onEditBooking(getTableStatus(selectedTable).booking)}
                        className="text-sm text-primary hover:text-primary-dark"
                      >
                        Edit Booking
                      </button>

                      <select
                        value={getTableStatus(selectedTable).booking.status}
                        onChange={(e) => updateBookingStatus(getTableStatus(selectedTable).booking._id, e.target.value)}
                        className="text-sm border-gray-300 rounded-md"
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
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  Table is available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="font-medium mb-3">Current Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Total Tables:</span>
              <span className="font-medium">{tables.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Occupied Tables:</span>
              <span className="font-medium">
                {tables.filter(table => getTableStatus(table).booking).length}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Available Tables:</span>
              <span className="font-medium">
                {tables.filter(table => !getTableStatus(table).booking).length}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Active Bookings:</span>
              <span className="font-medium">
                {bookings.filter(b =>
                  moment(b.timeSlot.start).isSameOrBefore(moment(date + ' ' + selectedTime)) &&
                  moment(b.timeSlot.end).isAfter(moment(date + ' ' + selectedTime)) &&
                  b.status !== 'cancelled' && b.status !== 'no-show'
                ).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedFloorPlan;
