import React, { useState, useEffect } from 'react';
import { Clock, User, Mail, Phone, Menu } from 'lucide-react';

const FloorPlan = ({ date, bookings, updateBookingStatus }) => {
  const [floorPlanData, setFloorPlanData] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFloorPlanData();

    // Set current time in HH:MM format
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setCurrentTime(`${hours}:${minutes}`);
  }, [date]);

  const fetchFloorPlanData = async () => {
    setIsLoading(true);

    // This would be an API call in a real implementation
    // Simulating API call with static data
    setTimeout(() => {
      // Create mock floor plan data with tables
      const mockTables = [
        // Indoor tables (2-seaters)
        { id: 'A1', tableNumber: 'A1', capacity: 2, section: 'indoor', shape: 'round', x: 100, y: 100, width: 60, height: 60 },
        { id: 'A2', tableNumber: 'A2', capacity: 2, section: 'indoor', shape: 'round', x: 100, y: 180, width: 60, height: 60 },
        { id: 'A3', tableNumber: 'A3', capacity: 2, section: 'indoor', shape: 'round', x: 180, y: 100, width: 60, height: 60 },
        { id: 'A4', tableNumber: 'A4', capacity: 2, section: 'indoor', shape: 'round', x: 180, y: 180, width: 60, height: 60 },
        { id: 'A5', tableNumber: 'A5', capacity: 2, section: 'indoor', shape: 'round', x: 260, y: 100, width: 60, height: 60 },
        { id: 'A6', tableNumber: 'A6', capacity: 2, section: 'indoor', shape: 'round', x: 260, y: 180, width: 60, height: 60 },
        { id: 'A7', tableNumber: 'A7', capacity: 2, section: 'indoor', shape: 'round', x: 340, y: 100, width: 60, height: 60 },
        { id: 'A8', tableNumber: 'A8', capacity: 2, section: 'indoor', shape: 'round', x: 340, y: 180, width: 60, height: 60 },
        { id: 'A9', tableNumber: 'A9', capacity: 2, section: 'indoor', shape: 'round', x: 420, y: 100, width: 60, height: 60 },
        { id: 'A10', tableNumber: 'A10', capacity: 2, section: 'indoor', shape: 'round', x: 420, y: 180, width: 60, height: 60 },
        { id: 'A11', tableNumber: 'A11', capacity: 2, section: 'indoor', shape: 'round', x: 100, y: 280, width: 60, height: 60 },
        { id: 'A12', tableNumber: 'A12', capacity: 2, section: 'indoor', shape: 'round', x: 180, y: 280, width: 60, height: 60 },
        { id: 'A13', tableNumber: 'A13', capacity: 2, section: 'indoor', shape: 'round', x: 260, y: 280, width: 60, height: 60 },
        { id: 'A14', tableNumber: 'A14', capacity: 2, section: 'indoor', shape: 'round', x: 340, y: 280, width: 60, height: 60 },
        { id: 'A15', tableNumber: 'A15', capacity: 2, section: 'indoor', shape: 'round', x: 420, y: 280, width: 60, height: 60 },

        // Outdoor tables (2-seaters)
        { id: 'O1', tableNumber: 'O1', capacity: 2, section: 'outdoor', shape: 'round', x: 100, y: 400, width: 60, height: 60 },
        { id: 'O2', tableNumber: 'O2', capacity: 2, section: 'outdoor', shape: 'round', x: 180, y: 400, width: 60, height: 60 },
        { id: 'O3', tableNumber: 'O3', capacity: 2, section: 'outdoor', shape: 'round', x: 260, y: 400, width: 60, height: 60 },
        { id: 'O4', tableNumber: 'O4', capacity: 2, section: 'outdoor', shape: 'round', x: 340, y: 400, width: 60, height: 60 },
        { id: 'O5', tableNumber: 'O5', capacity: 2, section: 'outdoor', shape: 'round', x: 420, y: 400, width: 60, height: 60 },
      ];

      setFloorPlanData(mockTables);
      setIsLoading(false);
    }, 600);
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);

    // Find booking associated with this table
    const tableBooking = bookings.find(booking =>
      booking.tables.some(t => t.id === table.id)
    );

    setSelectedBooking(tableBooking || null);
  };

  // Format time for display (ISO -> 6:00 PM)
  const formatTime = (isoTime) => {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get table status and color based on bookings
  const getTableStatus = (tableId) => {
    const tableBooking = bookings.find(booking =>
      booking.tables.some(t => t.id === tableId)
    );

    if (!tableBooking) {
      return { status: 'available', color: '#E5E7EB', textColor: '#111827' }; // Gray for available
    }

    // Check if booking is for current time
    const bookingStart = new Date(tableBooking.timeSlot.start);
    const bookingEnd = new Date(tableBooking.timeSlot.end);
    const now = new Date();

    const isNow = now >= bookingStart && now <= bookingEnd;

    // Use status-based colors with opacity for non-current bookings
    switch (tableBooking.status) {
      case 'seated':
        return {
          status: 'seated',
          color: isNow ? '#22C55E' : 'rgba(34, 197, 94, 0.5)', // Green
          textColor: '#FFFFFF'
        };
      case 'confirmed':
        return {
          status: 'confirmed',
          color: isNow ? '#3B82F6' : 'rgba(59, 130, 246, 0.5)', // Blue
          textColor: '#FFFFFF'
        };
      case 'pending':
        return {
          status: 'pending',
          color: isNow ? '#FBBF24' : 'rgba(251, 191, 36, 0.5)', // Yellow
          textColor: '#111827'
        };
      case 'cancelled':
        return {
          status: 'cancelled',
          color: isNow ? '#EF4444' : 'rgba(239, 68, 68, 0.5)', // Red
          textColor: '#FFFFFF'
        };
      case 'no-show':
        return {
          status: 'no-show',
          color: isNow ? '#9CA3AF' : 'rgba(156, 163, 175, 0.5)', // Gray
          textColor: '#FFFFFF'
        };
      default:
        return {
          status: 'reserved',
          color: isNow ? '#8B5CF6' : 'rgba(139, 92, 246, 0.5)', // Purple
          textColor: '#FFFFFF'
        };
    }
  };

  // Find tables that are part of the same booking
  const getGroupedTables = (tableId) => {
    const booking = bookings.find(b => b.tables.some(t => t.id === tableId));
    if (!booking || booking.tables.length <= 1) return [];

    return booking.tables.map(t => t.id).filter(id => id !== tableId);
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-xl font-semibold">Floor Plan</h3>
        <div className="flex space-x-6">
          <div className="flex items-center text-sm">
            <Clock size={16} className="mr-1 text-primary" />
            <span>Current time: {currentTime}</span>
          </div>
          <div className="flex space-x-3">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#E5E7EB' }}></div>
              <span className="text-xs">Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-xs">Confirmed</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#22C55E' }}></div>
              <span className="text-xs">Seated</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#FBBF24' }}></div>
              <span className="text-xs">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <span>Loading floor plan...</span>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Floor Plan */}
          <div className="flex-1 border border-gray-200 rounded-lg bg-white p-4 relative" style={{ minHeight: '500px' }}>
            {/* Indoor section label */}
            <div className="absolute top-2 left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium">
              Indoor Area (15 tables)
            </div>

            {/* Outdoor section label */}
            <div className="absolute top-[380px] left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium">
              Outdoor Area (5 tables)
            </div>

            {/* Tables */}
            {floorPlanData.map(table => {
              const { status, color, textColor } = getTableStatus(table.id);
              const groupedTables = getGroupedTables(table.id);
              const isGrouped = groupedTables.length > 0;

              return (
                <div
                  key={table.id}
                  className={`absolute flex items-center justify-center cursor-pointer transition-all duration-200 ${
                    selectedTable && selectedTable.id === table.id ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{
                    left: `${table.x}px`,
                    top: `${table.y}px`,
                    width: `${table.width}px`,
                    height: `${table.height}px`,
                    backgroundColor: color,
                    color: textColor,
                    borderRadius: table.shape === 'round' ? '50%' : '4px',
                    border: isGrouped ? '2px dashed #b22222' : 'none',
                    zIndex: selectedTable && selectedTable.id === table.id ? 50 : 10
                  }}
                  onClick={() => handleTableClick(table)}
                >
                  <div className="text-xs font-medium">{table.tableNumber}</div>
                </div>
              );
            })}

            {/* Connection lines for grouped tables */}
            {floorPlanData.map(table => {
              const groupedTables = getGroupedTables(table.id);

              // Only draw lines from the first table in each group to avoid duplicates
              const isFirstInGroup = groupedTables.length > 0 &&
                table.id < Math.min(...groupedTables);

              if (!isFirstInGroup) return null;

              return groupedTables.map(groupedId => {
                const groupedTable = floorPlanData.find(t => t.id === groupedId);
                if (!groupedTable) return null;

                // Calculate line position
                const x1 = table.x + table.width / 2;
                const y1 = table.y + table.height / 2;
                const x2 = groupedTable.x + groupedTable.width / 2;
                const y2 = groupedTable.y + groupedTable.height / 2;

                // Calculate line length and angle
                const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

                return (
                  <div
                    key={`${table.id}-${groupedId}`}
                    className="absolute origin-left"
                    style={{
                      left: `${x1}px`,
                      top: `${y1}px`,
                      width: `${length}px`,
                      height: '2px',
                      backgroundColor: '#b22222',
                      transform: `rotate(${angle}deg)`,
                      zIndex: 5
                    }}
                  ></div>
                );
              });
            })}
          </div>

          {/* Details Panel */}
          <div className="w-full md:w-80">
            {selectedTable ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-md">
                <h4 className="font-semibold mb-2 flex items-center justify-between border-b border-gray-200 pb-2">
                  <span>Table {selectedTable.tableNumber}</span>
                  <button
                    onClick={() => setSelectedTable(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    &times;
                  </button>
                </h4>

                <div className="text-sm">
                  <div className="flex items-center mb-1">
                    <User size={14} className="mr-1 text-primary" />
                    <span>Capacity: {selectedTable.capacity} guests</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <span className="capitalize">Section: {selectedTable.section}</span>
                  </div>
                </div>

                <div className="mt-4">
                  {selectedBooking ? (
                    <div>
                      <h5 className="font-medium border-t border-gray-200 pt-3 mb-2">Current Booking</h5>
                      <div className="text-sm">
                        <div className="mb-2">
                          <p className="font-medium">{selectedBooking.customer.name}</p>
                          <div className="flex items-center text-xs text-gray-600">
                            <Mail size={12} className="mr-1 text-primary" />
                            <span>{selectedBooking.customer.email}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-600">
                            <Phone size={12} className="mr-1 text-primary" />
                            <span>{selectedBooking.customer.phone}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <p className="text-xs text-gray-600">Time</p>
                            <p>{formatTime(selectedBooking.timeSlot.start)} - {formatTime(selectedBooking.timeSlot.end)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Party Size</p>
                            <p>{selectedBooking.partySize} guests</p>
                          </div>
                        </div>

                        {selectedBooking.specialRequests && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-600">Special Requests</p>
                            <p className="italic">{selectedBooking.specialRequests}</p>
                          </div>
                        )}

                        <div className="mb-2">
                          <p className="text-xs text-gray-600">Status</p>
                          <div className="mt-1">
                            <select
                              value={selectedBooking.status}
                              onChange={(e) => updateBookingStatus(selectedBooking.id, e.target.value)}
                              className="w-full p-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirm</option>
                              <option value="seated">Seat</option>
                              <option value="completed">Complete</option>
                              <option value="cancelled">Cancel</option>
                              <option value="no-show">No Show</option>
                            </select>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-2 mt-3">
                          <p className="text-xs text-gray-600">Assigned Tables</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {selectedBooking.tables.map(table => (
                              <span
                                key={table.id}
                                className="px-2 py-1 bg-gray-100 text-xs rounded"
                              >
                                {table.tableNumber}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3 text-gray-500">
                      <p>No current booking for this table</p>
                      <button
                        className="mt-2 px-3 py-1 text-sm rounded text-white bg-primary hover:bg-primary-dark transition-colors"
                      >
                        Create Booking
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center py-8 shadow-md">
                <Menu size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">Select a table to see details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlan;
