// src/components/SimplifiedFloorPlan.jsx
import React, { useState, useEffect } from 'react';
import { Clock, User, Mail, Phone, AlertCircle, Info, Edit3, Plus } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';

const SimplifiedFloorPlan = ({ date, selectedTime, bookings, updateBookingStatus, onEditBooking }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [draggedBooking, setDraggedBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredBooking, setHoveredBooking] = useState(null);

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
    // First, group tables by booking to keep them together
    const tablesWithPositions = new Map();
    const unassignedTables = new Set(tableData);

    // Find all bookings at selected time
    const selectedDateTime = moment(date + ' ' + selectedTime);
    const activeBookings = bookings.filter(booking =>
      booking.tables?.length > 0 &&
      moment(booking.timeSlot.start).isSameOrBefore(selectedDateTime) &&
      moment(booking.timeSlot.end).isAfter(selectedDateTime)
    );

    // Process grouped tables first
    let nextPosition = { x: 100, y: 100 };
    const sectionStartPositions = {
      indoor: { x: 100, y: 100 },
      outdoor: { x: 100, y: 400 },
      bar: { x: 700, y: 100 },
      window: { x: 20, y: 100 }
    };

    activeBookings.forEach(booking => {
      const bookingTables = tableData.filter(table =>
        booking.tables.some(t => t._id === table._id)
      );

      if (bookingTables.length > 0) {
        // Group these tables together
        const firstTable = bookingTables[0];
        const section = firstTable.section || 'indoor';
        nextPosition = sectionStartPositions[section];

        bookingTables.forEach((table, idx) => {
          const size = table.capacity <= 2 ? 50 : table.capacity <= 4 ? 60 : 70;

          // Arrange tables in a compact row or grid
          const position = {
            x: nextPosition.x + (idx % 3) * (size + 10),
            y: nextPosition.y + Math.floor(idx / 3) * (size + 10),
            width: size,
            height: size,
            shape: table.capacity > 4 ? 'rect' : 'round'
          };

          tablesWithPositions.set(table._id, {
            ...table,
            ...position
          });

          unassignedTables.delete(table);
        });

        // Update position for next booking
        const groupWidth = Math.min(bookingTables.length, 3) * (60 + 10);
        const groupHeight = Math.ceil(bookingTables.length / 3) * (60 + 10);
        sectionStartPositions[section] = {
          x: nextPosition.x + groupWidth + 30,
          y: nextPosition.y
        };
      }
    });

    // Position remaining unassigned tables
    const remainingTables = Array.from(unassignedTables);
    const sections = {
      indoor: [],
      outdoor: [],
      bar: [],
      window: [],
      other: []
    };

    remainingTables.forEach(table => {
      const section = table.section || 'other';
      if (sections[section]) {
        sections[section].push(table);
      } else {
        sections.other.push(table);
      }
    });

    // Process remaining tables by section
    Object.entries(sections).forEach(([sectionName, sectionTables]) => {
      if (sectionTables.length === 0) return;

      const startPos = sectionStartPositions[sectionName] || sectionStartPositions.indoor;
      sectionTables.forEach((table, index) => {
        const size = table.capacity <= 2 ? 50 : table.capacity <= 4 ? 60 : 70;
        const position = {
          x: startPos.x + (index % 4) * (size + 20),
          y: startPos.y + Math.floor(index / 4) * (size + 20),
          width: size,
          height: size,
          shape: table.capacity > 4 ? 'rect' : 'round'
        };

        tablesWithPositions.set(table._id, {
          ...table,
          ...position
        });
      });
    });

    return Array.from(tablesWithPositions.values());
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
             bookingStart.isSameOrBefore(selectedDateTime) &&
             bookingEnd.isAfter(selectedDateTime);
    });
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
  };

  const handleDragStart = (booking, e) => {
    setDraggedBooking(booking);
    e.dataTransfer.setData('text/plain', booking._id);
  };

  const handleTableDrop = async (table, e) => {
    e.preventDefault();
    if (!draggedBooking) return;

    try {
      const response = await apiService.bookings.updateBooking(draggedBooking._id, {
        tableId: table._id
      });

      if (response.success) {
        updateBookingStatus(draggedBooking._id, draggedBooking.status);
      }
    } catch (error) {
      console.error('Error assigning table:', error);
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
      if (booking.tables && booking.tables.length > 1) {
        const bookingTables = getBookingTables(booking);

        bookingTables.sort((a, b) => {
          if (Math.abs(a.y - b.y) < 20) {
            return a.x - b.x;
          }
          return a.y - b.y;
        });

        for (let i = 0; i < bookingTables.length - 1; i++) {
          const table1 = bookingTables[i];
          const table2 = bookingTables[i + 1];

          const distance = Math.sqrt(
            Math.pow(table2.x - table1.x, 2) +
            Math.pow(table2.y - table1.y, 2)
          );

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

        <div className="relative min-h-[600px] border border-gray-200 rounded-lg bg-gray-50">
          {/* Section Labels */}
          <div className="absolute top-4 left-4 bg-blue-100 px-2 py-1 rounded text-xs font-medium">
            Indoor
          </div>
          <div className="absolute top-[380px] left-4 bg-green-100 px-2 py-1 rounded text-xs font-medium">
            Outdoor
          </div>
          <div className="absolute top-4 right-4 bg-yellow-100 px-2 py-1 rounded text-xs font-medium">
            Bar
          </div>

          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {renderTableConnections()}
          </svg>

          {tables.map(table => {
            const { status, color, booking, isGrouped } = getTableStatus(table);
            const isSelected = selectedTable?._id === table._id;

            return (
              <div
                key={table._id}
                className={`absolute flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                style={{
                  left: `${table.x}px`,
                  top: `${table.y}px`,
                  width: `${table.width}px`,
                  height: `${table.height}px`,
                  backgroundColor: status === 'available' ? '#f3f4f6' : 'transparent',
                  borderRadius: table.shape === 'round' ? '50%' : '8px',
                  boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  border: status !== 'available' ? `2px solid ${color}` : '1px solid #e5e7eb',
                  background: status !== 'available' ? `${color}20` : '#f3f4f6'
                }}
                onClick={() => handleTableClick(table)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleTableDrop(table, e)}
                onMouseEnter={() => booking && setHoveredBooking(booking._id)}
                onMouseLeave={() => setHoveredBooking(null)}
              >
                <div className={`text-center font-medium ${status === 'available' ? 'text-gray-600' : 'text-gray-900'}`}>
                  <div className="text-lg">{table.tableNumber}</div>
                  {booking && (
                    <div className="text-xs mt-0.5 font-normal">{booking.partySize} guests</div>
                  )}
                </div>

                {/* Updated hover tooltip */}
                {booking && hoveredBooking === booking._id && (
                  <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-white rounded-lg p-2 shadow-md text-black text-sm z-50 whitespace-nowrap">
                    <div className="font-bold">{booking.customer.name}</div>
                    <div className="text-xs text-gray-600">{formatTime(booking.timeSlot.start)} - {formatTime(booking.timeSlot.end)}</div>
                    <div className="mt-0.5 text-xs capitalize px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '20', color: color }}>
                      {booking.status}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300 mr-2"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F620', border: '2px solid #3B82F6' }}></div>
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
                  className="p-3 bg-gray-50 rounded border border-gray-200 cursor-move hover:bg-gray-100"
                  draggable
                  onDragStart={(e) => handleDragStart(booking, e)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{booking.customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {booking.partySize} guests • {formatTime(booking.timeSlot.start)}
                      </div>
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
                <span className="text-gray-500">Section:</span> {selectedTable.section || 'General'}
              </div>

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
                  moment(b.timeSlot.end).isAfter(moment(date + ' ' + selectedTime))
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
