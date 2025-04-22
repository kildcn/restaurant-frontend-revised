// src/components/EnhancedFloorPlan.jsx
import React, { useState, useEffect } from 'react';
import { Clock, User, Mail, Phone, AlertCircle, Info, Edit3, Plus, Users, Table, ChefHat, Wine } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';

const EnhancedFloorPlan = ({ date, selectedTime, bookings, updateBookingStatus, onEditBooking }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [draggedBooking, setDraggedBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredBooking, setHoveredBooking] = useState(null);
  const [dragOverTable, setDragOverTable] = useState(null);
  const [viewMode, setViewMode] = useState('realistic'); // 'realistic' or 'grid'

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.tables.getTables();
      if (response.success) {
        const allTables = response.data || [];
        setTables(allTables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Define restaurant layout sections
  const restaurantLayout = {
    dimensions: { width: 1200, height: 800 },
    sections: {
      mainDining: {
        x: 100,
        y: 100,
        width: 700,
        height: 400,
        background: '#f8fafc',
        border: '#e2e8f0'
      },
      bar: {
        x: 850,
        y: 100,
        width: 250,
        height: 200,
        background: '#f1f5f9',
        border: '#cbd5e1'
      },
      outdoor: {
        x: 100,
        y: 550,
        width: 700,
        height: 200,
        background: '#ecfdf5',
        border: '#a7f3d0'
      },
      kitchen: {
        x: 850,
        y: 350,
        width: 250,
        height: 150,
        background: '#fef2f2',
        border: '#fecaca'
      }
    }
  };

  // Generate table positions based on layout
  const getTablePosition = (table) => {
    const positions = {
      indoor: {
        1: { x: 150, y: 150, shape: 'circle', size: 70 },
        2: { x: 250, y: 150, shape: 'circle', size: 70 },
        3: { x: 350, y: 150, shape: 'circle', size: 70 },
        4: { x: 450, y: 150, shape: 'circle', size: 70 },
        5: { x: 550, y: 150, shape: 'circle', size: 70 },
        6: { x: 150, y: 250, shape: 'rectangle', width: 90, height: 60 },
        7: { x: 300, y: 250, shape: 'rectangle', width: 90, height: 60 },
        8: { x: 450, y: 250, shape: 'rectangle', width: 90, height: 60 },
        9: { x: 600, y: 250, shape: 'rectangle', width: 90, height: 60 },
        10: { x: 150, y: 350, shape: 'circle', size: 90 },
        11: { x: 300, y: 350, shape: 'circle', size: 90 },
        12: { x: 450, y: 350, shape: 'circle', size: 90 },
        13: { x: 600, y: 350, shape: 'circle', size: 90 },
      },
      bar: {
        100: { x: 900, y: 150, shape: 'circle', size: 50 },
        101: { x: 970, y: 150, shape: 'circle', size: 50 },
        102: { x: 1040, y: 150, shape: 'circle', size: 50 },
      },
      outdoor: {
        50: { x: 150, y: 600, shape: 'rectangle', width: 80, height: 60 },
        51: { x: 250, y: 600, shape: 'rectangle', width: 80, height: 60 },
        52: { x: 350, y: 600, shape: 'rectangle', width: 80, height: 60 },
        53: { x: 450, y: 600, shape: 'rectangle', width: 80, height: 60 },
        54: { x: 550, y: 600, shape: 'rectangle', width: 80, height: 60 },
        55: { x: 650, y: 600, shape: 'rectangle', width: 80, height: 60 },
        56: { x: 150, y: 680, shape: 'rectangle', width: 80, height: 60 },
        57: { x: 250, y: 680, shape: 'rectangle', width: 80, height: 60 },
        58: { x: 350, y: 680, shape: 'rectangle', width: 80, height: 60 },
      },
      window: {
        20: { x: 700, y: 150, shape: 'circle', size: 60 },
        21: { x: 700, y: 220, shape: 'circle', size: 60 },
        22: { x: 700, y: 290, shape: 'circle', size: 60 },
        23: { x: 700, y: 360, shape: 'circle', size: 60 },
      }
    };

    const section = table.section || 'indoor';
    return positions[section]?.[table.tableNumber] || { x: 100, y: 100, shape: 'circle', size: 60 };
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
      color: getBookingStatusColor(booking.status),
      booking,
      isGrouped: booking.tables.length > 1
    };
  };

  const getBookingStatusColor = (status) => {
    const colors = {
      confirmed: '#3B82F6',
      seated: '#10B981',
      completed: '#8B5CF6',
      pending: '#F59E0B',
      cancelled: '#EF4444',
      'no-show': '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);
  };

  const handleDragStart = (booking, e) => {
    setDraggedBooking(booking);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTableDragOver = (table, e) => {
    e.preventDefault();

    if (draggedBooking && !draggedBooking.isAdminBooking && table.section === 'outdoor') {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    setDragOverTable(table._id);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTableDrop = async (table, e) => {
    e.preventDefault();
    setDragOverTable(null);

    if (!draggedBooking) return;

    if (!draggedBooking.isAdminBooking && table.section === 'outdoor') {
      alert('Customer bookings can only be assigned to indoor tables.');
      return;
    }

    if (table.capacity < draggedBooking.partySize) {
      alert(`Table capacity (${table.capacity}) is less than party size (${draggedBooking.partySize}).`);
      return;
    }

    try {
      const response = await apiService.bookings.updateBooking(draggedBooking._id, {
        tables: [table._id]
      });

      if (response.success) {
        updateBookingStatus(draggedBooking._id, draggedBooking.status);
      }
    } catch (error) {
      console.error('Error assigning table:', error);
      alert('Failed to assign table. Please try again.');
    }

    setDraggedBooking(null);
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

  const renderRestaurantElements = () => {
    const { sections } = restaurantLayout;

    return (
      <>
        {/* Kitchen */}
        <rect
          x={sections.kitchen.x}
          y={sections.kitchen.y}
          width={sections.kitchen.width}
          height={sections.kitchen.height}
          fill={sections.kitchen.background}
          stroke={sections.kitchen.border}
          strokeWidth="2"
        />
        <g transform={`translate(${sections.kitchen.x + sections.kitchen.width/2}, ${sections.kitchen.y + sections.kitchen.height/2})`}>
          <ChefHat size={32} className="text-red-400" />
          <text y="25" textAnchor="middle" className="text-sm font-medium">Kitchen</text>
        </g>

        {/* Bar */}
        <rect
          x={sections.bar.x}
          y={sections.bar.y}
          width={sections.bar.width}
          height={sections.bar.height}
          fill={sections.bar.background}
          stroke={sections.bar.border}
          strokeWidth="2"
        />
        <g transform={`translate(${sections.bar.x + sections.bar.width/2}, ${sections.bar.y + 20})`}>
          <Wine size={24} className="text-blue-400" />
          <text y="25" textAnchor="middle" className="text-sm font-medium">Bar</text>
        </g>

        {/* Main Dining */}
        <rect
          x={sections.mainDining.x}
          y={sections.mainDining.y}
          width={sections.mainDining.width}
          height={sections.mainDining.height}
          fill={sections.mainDining.background}
          stroke={sections.mainDining.border}
          strokeWidth="2"
        />
        <text x={sections.mainDining.x + 10} y={sections.mainDining.y + 20} className="text-sm font-medium">Main Dining</text>

        {/* Outdoor */}
        <rect
          x={sections.outdoor.x}
          y={sections.outdoor.y}
          width={sections.outdoor.width}
          height={sections.outdoor.height}
          fill={sections.outdoor.background}
          stroke={sections.outdoor.border}
          strokeWidth="2"
        />
        <text x={sections.outdoor.x + 10} y={sections.outdoor.y + 20} className="text-sm font-medium">Outdoor Terrace</text>

        {/* Window decoration */}
        <line
          x1={sections.mainDining.x + sections.mainDining.width}
          y1={sections.mainDining.y}
          x2={sections.mainDining.x + sections.mainDining.width}
          y2={sections.mainDining.y + sections.mainDining.height}
          stroke="#9CA3AF"
          strokeWidth="8"
        />
        <text
          x={sections.mainDining.x + sections.mainDining.width + 20}
          y={sections.mainDining.y + sections.mainDining.height/2}
          transform={`rotate(-90 ${sections.mainDining.x + sections.mainDining.width + 20} ${sections.mainDining.y + sections.mainDining.height/2})`}
          className="text-xs text-gray-500"
        >
          WINDOW
        </text>
      </>
    );
  };

  const renderTable = (table) => {
    const position = getTablePosition(table);
    const { status, color, booking } = getTableStatus(table);
    const isSelected = selectedTable?._id === table._id;
    const isDragOver = dragOverTable === table._id;

    return (
      <g
        key={table._id}
        transform={`translate(${position.x}, ${position.y})`}
        className="cursor-pointer"
        onClick={() => handleTableClick(table)}
        onDragOver={(e) => handleTableDragOver(table, e)}
        onDragLeave={() => setDragOverTable(null)}
        onDrop={(e) => handleTableDrop(table, e)}
        onMouseEnter={() => booking && setHoveredBooking(booking._id)}
        onMouseLeave={() => setHoveredBooking(null)}
      >
        {position.shape === 'circle' ? (
          <>
            <circle
              cx="0"
              cy="0"
              r={position.size / 2}
              fill={status === 'available' ? '#ffffff' : `${color}20`}
              stroke={status === 'available' ? '#9CA3AF' : color}
              strokeWidth={isSelected ? 3 : 2}
              className={`transition-all ${isDragOver ? 'stroke-primary stroke-[3]' : ''}`}
            />
            {/* Chairs for circle tables */}
            {[...Array(table.capacity)].map((_, i) => {
              const angle = (i * 360) / table.capacity;
              const chairX = Math.cos((angle * Math.PI) / 180) * (position.size / 2 + 10);
              const chairY = Math.sin((angle * Math.PI) / 180) * (position.size / 2 + 10);

              return (
                <circle
                  key={`chair-${i}`}
                  cx={chairX}
                  cy={chairY}
                  r="6"
                  fill="#E5E7EB"
                  stroke="#9CA3AF"
                  strokeWidth="1"
                />
              );
            })}
          </>
        ) : (
          <>
            <rect
              x={-position.width / 2}
              y={-position.height / 2}
              width={position.width}
              height={position.height}
              fill={status === 'available' ? '#ffffff' : `${color}20`}
              stroke={status === 'available' ? '#9CA3AF' : color}
              strokeWidth={isSelected ? 3 : 2}
              rx="6"
              className={`transition-all ${isDragOver ? 'stroke-primary stroke-[3]' : ''}`}
            />
            {/* Chairs for rectangular tables */}
            {table.capacity <= 4 && [
              { x: 0, y: -position.height/2 - 10 }, // top
              { x: 0, y: position.height/2 + 10 }, // bottom
              { x: -position.width/2 - 10, y: 0 }, // left
              { x: position.width/2 + 10, y: 0 }, // right
            ].slice(0, table.capacity).map((pos, i) => (
              <rect
                key={`chair-${i}`}
                x={pos.x - 5}
                y={pos.y - 5}
                width="10"
                height="10"
                fill="#E5E7EB"
                stroke="#9CA3AF"
                strokeWidth="1"
                rx="2"
              />
            ))}
          </>
        )}

        {/* Table number */}
        <text
          y="-5"
          textAnchor="middle"
          className="text-xs font-bold fill-gray-700"
        >
          {table.tableNumber}
        </text>

        {/* Capacity info */}
        <text
          y="10"
          textAnchor="middle"
          className="text-[10px] fill-gray-500"
        >
          {table.capacity} seats
        </text>

        {/* Party size if booked */}
        {booking && (
          <text
            y="22"
            textAnchor="middle"
            className="text-[10px] font-medium"
            fill={color}
          >
            {booking.partySize} guests
          </text>
        )}

        {/* Customer name if hovered */}
        {booking && hoveredBooking === booking._id && (
          <text
            y="34"
            textAnchor="middle"
            className="text-[10px] font-medium"
          >
            {booking.customer.name}
          </text>
        )}
      </g>
    );
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
          <div className="flex items-center space-x-4">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="realistic">Realistic View</option>
              <option value="grid">Grid View</option>
            </select>
            <div className="flex items-center text-sm text-gray-500">
              <Clock size={16} className="mr-1" />
              {moment(selectedTime, 'HH:mm').format('h:mm A')}
            </div>
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
          <svg
            viewBox={`0 0 ${restaurantLayout.dimensions.width} ${restaurantLayout.dimensions.height}`}
            className="w-full h-auto"
            style={{ aspectRatio: `${restaurantLayout.dimensions.width}/${restaurantLayout.dimensions.height}` }}
          >
            {/* Restaurant Elements */}
            {renderRestaurantElements()}

            {/* Tables */}
            {tables.map(renderTable)}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-white border border-gray-300 mr-2"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-500 mr-2"></div>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-green-100 border-2 border-green-500 mr-2"></div>
            <span>Seated</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-yellow-100 border-2 border-yellow-500 mr-2"></div>
            <span>Pending</span>
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
                        {booking.partySize} guests • {moment(booking.timeSlot.start).format('h:mm A')}
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
                All bookings assigned
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
                      <span className="text-gray-500">Time:</span> {moment(getTableStatus(selectedTable).booking.timeSlot.start).format('h:mm A')} - {moment(getTableStatus(selectedTable).booking.timeSlot.end).format('h:mm A')}
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Guests:</span> {getTableStatus(selectedTable).booking.partySize}
                    </div>

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

export default EnhancedFloorPlan;
