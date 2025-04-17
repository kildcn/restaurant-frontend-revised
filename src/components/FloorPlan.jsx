import React, { useState, useEffect, useCallback } from 'react';
import { Clock, User, Mail, Phone, Menu, Users, AlertCircle, Layers, Save, RefreshCw, Plus, X } from 'lucide-react';
import apiService from '../services/api';

const FloorPlan = ({ date, bookings, updateBookingStatus }) => {
  const [floorPlanData, setFloorPlanData] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [unassignedBookings, setUnassignedBookings] = useState([]);
  const [draggedBooking, setDraggedBooking] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('standard'); // 'standard', 'capacity', 'status'
  const [editMode, setEditMode] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'current', 'upcoming'
  const [section, setSection] = useState('all'); // 'all', 'indoor', 'outdoor'

  // Reset selection when date changes
  useEffect(() => {
    setSelectedTable(null);
    setSelectedBooking(null);
    console.log("Date changed:", date);
    fetchFloorPlanData();

    // Set current time in HH:MM format
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    // Update time every minute
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [date]);

  // Update unassigned bookings when bookings change
  useEffect(() => {
    if (bookings) {
      const unassigned = bookings.filter(booking =>
        !booking.tables || booking.tables.length === 0
      );
      setUnassignedBookings(unassigned);
    }
  }, [bookings]);

  const fetchFloorPlanData = async () => {
    setIsLoading(true);
    console.log("Fetching floor plan data...");

    try {
      const response = await apiService.tables.getTables();
      console.log("Tables response:", response);

      if (response.success) {
        // Create a floor plan with positions for each table
        const tablesWithPositions = assignTablePositions(response.tables || []);
        console.log("Tables with positions:", tablesWithPositions);
        setFloorPlanData(tablesWithPositions);
      } else {
        console.error("Error fetching tables:", response.error);
        setFloorPlanData([]);
      }
    } catch (error) {
      console.error("Error in fetchFloorPlanData:", error);
      setFloorPlanData([]);
    }

    setIsLoading(false);
  };

  // Function to assign positions to tables
  const assignTablePositions = (tables) => {
    if (!tables || !tables.length) {
      console.warn("No tables data received");
      return [];
    }

    // Sort tables to ensure consistent layout
    const sortedTables = [...tables].sort((a, b) => {
      const aNum = parseInt(a.tableNumber.replace(/\\D/g, ''));
      const bNum = parseInt(b.tableNumber.replace(/\\D/g, ''));
      return aNum - bNum;
    });

    const indoorTables = sortedTables.filter(t => t.section === 'indoor');
    const outdoorTables = sortedTables.filter(t => t.section === 'outdoor');

    // Create a more realistic layout for indoor tables
    const positionedIndoor = indoorTables.map((table, index) => {
      // Create a grid layout with 4 columns
      const row = Math.floor(index / 4);
      const col = index % 4;

      // Vary table shapes and sizes based on capacity
      const size = getTableSize(table.capacity);
      const shape = table.capacity > 4 ? 'rect' : 'round';

      return {
        ...table,
        x: 100 + (col * 120),  // x position based on column
        y: 100 + (row * 100),  // y position based on row
        width: shape === 'rect' ? size * 1.5 : size,
        height: size,
        shape: shape
      };
    });

    // Create a more realistic outdoor layout
    const positionedOutdoor = outdoorTables.map((table, index) => {
      const size = getTableSize(table.capacity);
      const shape = table.capacity > 4 ? 'rect' : 'round';

      // Position outdoor tables in two rows
      const row = Math.floor(index / 5);
      const col = index % 5;

      return {
        ...table,
        x: 100 + (col * 120),
        y: 400 + (row * 100),
        width: shape === 'rect' ? size * 1.5 : size,
        height: size,
        shape: shape
      };
    });

    return [...positionedIndoor, ...positionedOutdoor];
  };

  // Determine table size based on capacity
  const getTableSize = (capacity) => {
    if (capacity <= 2) return 50;
    if (capacity <= 4) return 60;
    if (capacity <= 6) return 70;
    return 80;  // For larger tables
  };

  const handleTableClick = (table) => {
    console.log("Table clicked:", table);
    setSelectedTable(table);

    // Find booking associated with this table
    const tableBooking = bookings && bookings.find(booking =>
      booking.tables && booking.tables.some(t => t._id === table._id)
    );

    setSelectedBooking(tableBooking || null);
  };

  // Handle drag start for booking
  const handleDragStart = (booking) => {
    setDraggedBooking(booking);
  };

  // Handle table drop (when booking is dropped on a table)
  const handleTableDrop = async (tableId) => {
    if (!draggedBooking) return;

    try {
      // Call API to assign booking to table
      const response = await apiService.bookings.updateBooking(draggedBooking._id, {
        tableId: tableId
      });

      if (response.success) {
        // Refresh bookings data after successful update
        console.log("Booking assigned to table successfully");
        // You'll need to implement a refresh function or use the component's props
      } else {
        console.error("Error assigning booking to table:", response.error);
      }
    } catch (error) {
      console.error("Error assigning booking to table:", error);
    }

    setDraggedBooking(null);
  };

  // Format time for display (ISO -> 6:00 PM)
  const formatTime = (isoTime) => {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get table status and color based on bookings
  const getTableStatus = (tableId) => {
    // Default status if no bookings array is provided
    if (!bookings || !bookings.length) {
      return { status: 'available', color: '#E5E7EB', textColor: '#111827' };
    }

    const tableBooking = bookings.find(booking =>
      booking.tables && booking.tables.some(t => t._id === tableId)
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
    if (!bookings || !bookings.length) return [];

    const booking = bookings.find(b => b.tables && b.tables.some(t => t._id === tableId));
    if (!booking || !booking.tables || booking.tables.length <= 1) return [];

    return booking.tables.map(t => t._id).filter(id => id !== tableId);
  };

  // Filter tables based on current section filter
  const filteredTables = section === 'all'
    ? floorPlanData
    : floorPlanData.filter(table => table.section === section);

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-semibold">Floor Plan</h3>

        <div className="flex flex-wrap gap-3">
          {/* Time indicator */}
          <div className="flex items-center text-sm bg-white px-3 py-1 rounded-full shadow-sm border">
            <Clock size={16} className="mr-1 text-primary" />
            <span>Current time: {currentTime}</span>
          </div>

          {/* Section Filter */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setSection('all')}
              className={`px-3 py-1 text-sm rounded-l-md ${section === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-r-0'}`}
            >
              All Areas
            </button>
            <button
              onClick={() => setSection('indoor')}
              className={`px-3 py-1 text-sm ${section === 'indoor'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-r-0'}`}
            >
              Indoor
            </button>
            <button
              onClick={() => setSection('outdoor')}
              className={`px-3 py-1 text-sm rounded-r-md ${section === 'outdoor'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border'}`}
            >
              Outdoor
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1 text-sm rounded-l-md ${viewMode === 'standard'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-r-0'}`}
            >
              Standard
            </button>
            <button
              onClick={() => setViewMode('capacity')}
              className={`px-3 py-1 text-sm ${viewMode === 'capacity'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-r-0'}`}
            >
              Capacity
            </button>
            <button
              onClick={() => setViewMode('status')}
              className={`px-3 py-1 text-sm rounded-r-md ${viewMode === 'status'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border'}`}
            >
              Status
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchFloorPlanData}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-white text-gray-700 border rounded-md shadow-sm hover:bg-gray-50"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Status Legend */}
        <div className="lg:order-last lg:w-80">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
            <h4 className="font-medium mb-2 text-sm uppercase text-gray-500">Table Status</h4>
            <div className="grid grid-cols-2 gap-2">
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
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#EF4444' }}></div>
                <span className="text-xs">Cancelled</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-1" style={{ backgroundColor: '#9CA3AF' }}></div>
                <span className="text-xs">No Show</span>
              </div>
            </div>
          </div>

          {/* Unassigned Bookings */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
            <h4 className="font-medium mb-2 text-sm uppercase text-gray-500">Unassigned Bookings</h4>
            {unassignedBookings.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-auto">
                {unassignedBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="p-2 border border-gray-200 rounded bg-gray-50 cursor-pointer hover:bg-gray-100"
                    draggable
                    onDragStart={() => handleDragStart(booking)}
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">{booking.customer.name}</div>
                      <div className="text-xs bg-gray-200 px-1 rounded">{booking.partySize} pax</div>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatTime(booking.timeSlot.start)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-2">
                No unassigned bookings
              </div>
            )}
          </div>

          {/* Table/Booking Details Panel */}
          {selectedTable ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
                  <Users size={14} className="mr-1 text-primary" />
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
                            onChange={(e) => updateBookingStatus(selectedBooking._id, e.target.value)}
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
                          {selectedBooking.tables && selectedBooking.tables.map(table => (
                            <span
                              key={table._id}
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
          ) : selectedBooking ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold mb-2 flex items-center justify-between border-b border-gray-200 pb-2">
                <span>Booking Details</span>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </h4>

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
                      onChange={(e) => updateBookingStatus(selectedBooking._id, e.target.value)}
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

                <div className="mt-3 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Assign to Table</p>
                  <p className="text-xs text-gray-500 mb-2">Drag this booking to a table or select from below:</p>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                    {floorPlanData.map(table => (
                      <button
                        key={table._id}
                        className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100"
                        onClick={() => handleTableDrop(table._id)}
                      >
                        {table.tableNumber} ({table.capacity})
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center py-8 shadow-sm">
              <Menu size={24} className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Select a table or booking to see details</p>
            </div>
          )}
        </div>

        {/* Floor Plan */}
        <div className="flex-1 border border-gray-200 rounded-lg bg-white p-4 relative" style={{ minHeight: '600px' }}>
          {/* Debug info */}
          {floorPlanData.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              {isLoading ? (
                <div className="text-center">
                  <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-primary rounded-full mb-2"></div>
                  <p>Loading floor plan...</p>
                </div>
              ) : (
                <div className="text-center">
                  <AlertCircle size={24} className="mx-auto mb-2" />
                  <p>No table data available</p>
                </div>
              )}
            </div>
          )}

          {/* Section labels */}
          {filteredTables.some(t => t.section === 'indoor') && (
            <div className="absolute top-2 left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium">
              Indoor Area ({floorPlanData.filter(t => t.section === 'indoor').length} tables)
            </div>
          )}

          {filteredTables.some(t => t.section === 'outdoor') && (
            <div className="absolute top-[380px] left-2 bg-gray-100 px-2 py-1 rounded text-xs font-medium">
              Outdoor Area ({floorPlanData.filter(t => t.section === 'outdoor').length} tables)
            </div>
          )}

          {/* Tables */}
          {filteredTables.map(table => {
            const { status, color, textColor } = getTableStatus(table._id);
            const groupedTables = getGroupedTables(table._id);
            const isGrouped = groupedTables.length > 0;

            // Find booking associated with this table (if any)
            const tableBooking = bookings && bookings.find(booking =>
              booking.tables && booking.tables.some(t => t._id === table._id)
            );

            // Determine what text to display in the table based on view mode
            let displayText = table.tableNumber;
            if (viewMode === 'capacity') {
              displayText = table.capacity;
            } else if (viewMode === 'status' && tableBooking) {
              displayText = tableBooking.partySize;
            }

            return (
              <div
                key={table._id}
                className={`absolute flex items-center justify-center cursor-pointer transition-all duration-200 ${
                  selectedTable && selectedTable._id === table._id ? 'ring-2 ring-offset-2 ring-primary' : ''
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
                  zIndex: selectedTable && selectedTable._id === table._id ? 50 : 10
                }}
                onClick={() => handleTableClick(table)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleTableDrop(table._id)}
              >
                <div className="text-xs font-medium">{displayText}</div>

                {/* Show party size for tables with bookings */}
                {viewMode === 'standard' && tableBooking && (
                  <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-gray-600">
                    {tableBooking.partySize}p
                  </div>
                )}

                {/* Show time for tables with bookings */}
                {viewMode === 'status' && tableBooking && (
                  <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-gray-600">
                    {formatTime(tableBooking.timeSlot.start)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Connection lines for grouped tables */}
          {filteredTables.map(table => {
            const groupedTables = getGroupedTables(table._id);

            // Only draw lines from the first table in each group to avoid duplicates
            const isFirstInGroup = groupedTables.length > 0 &&
              table._id < Math.min(...groupedTables);

            if (!isFirstInGroup) return null;

            return groupedTables.map(groupedId => {
              const groupedTable = floorPlanData.find(t => t._id === groupedId);
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
                  key={`${table._id}-${groupedId}`}
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

          {/* Add table button - visible in edit mode */}
          {editMode && (
            <button
              className="absolute bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary-dark transition-colors"
              onClick={() => {/* Implement add table functionality */}}
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloorPlan;
