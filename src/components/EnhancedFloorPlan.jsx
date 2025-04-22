// src/components/EnhancedFloorPlan.jsx
import React, { useState, useEffect } from 'react';
import { Clock, User, AlertCircle, Info, Edit3, Users, ChefHat, Umbrella, Table as TableIcon, Check } from 'lucide-react'; // Assure-toi que Check est importé
import apiService from '../services/api';
import moment from 'moment';

const EnhancedFloorPlan = ({ date, selectedTime, bookings, updateBookingStatus, onEditBooking }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [draggedBooking, setDraggedBooking] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredBooking, setHoveredBooking] = useState(null);
  const [dragOverTable, setDragOverTable] = useState(null);
  const [bookingColors, setBookingColors] = useState({});

  const getBookingColor = (bookingId) => {
    if (!bookingId) return null;
    if (bookingColors[bookingId]) {
      return bookingColors[bookingId];
    }
    // Simple function to generate a somewhat unique color
    const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
    setBookingColors(prevColors => ({ ...prevColors, [bookingId]: color }));
    return color;
  };

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

  // Define restaurant layout sections - ONLY main dining and outdoor
  const restaurantLayout = {
    dimensions: { width: 1000, height: 650 },
    sections: {
      mainDining: {
        x: 50,
        y: 30,
        width: 900,
        height: 280,
        background: '#f8fafc',
        label: 'Main Dining Room'
      },
      outdoor: {
        x: 50,
        y: 350,
        width: 900,
        height: 270,
        background: '#ecfdf5',
        label: 'Outdoor Terrace'
      }
    }
  };

  // Intelligent table positioning system with proper spacing
  const getTablePosition = (table) => {
    const basePositions = {
      indoor: {
        2: { shape: 'circle', size: 60 },
        4: { shape: 'circle', size: 70 },
        6: { shape: 'rectangle', width: 120, height: 60 },
        8: { shape: 'rectangle', width: 160, height: 80 }
      },
      outdoor: {
        2: { shape: 'circle', size: 55 },
        4: { shape: 'circle', size: 65 },
        6: { shape: 'rectangle', width: 110, height: 55 }
      }
    };

    const section = table.section || 'indoor'; // Determine section ('indoor' or 'outdoor')
    const capacity = parseInt(table.capacity, 10) || 2;
    const sectionBasePositions = basePositions[section];

    // Default if capacity/section unknown
    if (!sectionBasePositions || !sectionBasePositions[capacity]) {
      console.warn(`No base position for ${capacity}-seat table in "${section}". Using default.`);
      // Use a reasonable default, maybe based on section
      const defaultPos = section === 'outdoor' ? basePositions.outdoor[2] : basePositions.indoor[2];
      // Ensure defaultPos exists, provide ultimate fallback if needed
      const fallbackPos = { shape: 'circle', size: 50 };
      return { x: 0, y: 0, ...(defaultPos || fallbackPos) }; // Return default shape/size
    }

    const base = sectionBasePositions[capacity];
    const spacingX = section === 'indoor' ? 140 : 130;
    const spacingY = 100; // Increased vertical spacing slightly
    // Determine the correct section object from restaurantLayout
    const layoutSection = restaurantLayout.sections[section === 'indoor' ? 'mainDining' : 'outdoor'];

    // Check if layoutSection exists to prevent errors
    if (!layoutSection) {
        console.error(`Layout section not found for section type: ${section}`);
        return { ...base, x: 0, y: 0 }; // Return base shape/size at origin
    }

    const startX = layoutSection.x + 80;
    // Adjust startY based on capacity for better vertical spacing within rows
    const startY = layoutSection.y + 70; // Consolidated base Y start

    // --- THIS LOGIC NOW APPLIES TO ALL TABLES ---

    // Table number parsing (handle prefixes like 'A' or 'O')
    const tablePrefix = table.tableNumber?.match(/^[A-Za-z]+/)?.[0] || '';
    const tableNumPart = table.tableNumber?.replace(tablePrefix, '');
    let index = parseInt(tableNumPart, 10);

    // If parsing failed or tableNumber is just a number string
    if (isNaN(index)) {
        index = parseInt(table.tableNumber, 10) || 1; // Fallback to direct parse or 1
        if (isNaN(index)) index = 1; // Ultimate fallback if tableNumber is non-numeric
    }

    // Determine grid position based on index (adjust columns per row if needed)
    const columnsPerRow = 5; // How many tables fit horizontally in a row
    const rowIndex = Math.floor((index - 1) / columnsPerRow);
    const colIndex = (index - 1) % columnsPerRow;

    // Calculate final position
    const calculatedX = startX + colIndex * spacingX;

    // Calculate Y position considering row and vertical spacing
    // Add extra space for larger tables (rectangles usually taller than circles)
    const extraYOffsetForLargeTable = base.shape === 'rectangle' ? 15 : 0;
    const calculatedY = startY + rowIndex * spacingY + extraYOffsetForLargeTable;

    // Log the final calculated position for debugging
    // console.log(`Table ${table.tableNumber} (Final Position): Section=${section}, Index=${index}, Row=${rowIndex}, Col=${colIndex}, X=${calculatedX}, Y=${calculatedY}`);

    return { ...base, x: calculatedX, y: calculatedY };
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

    if (!booking) return { status: 'available', color: '#E5E7EB', booking: null, isGrouped: false };

    return {
      status: booking.status,
      color: getBookingStatusColor(booking.status),
      booking,
      isGrouped: booking.tables.length > 1
    };
  };

  const getBookingStatusColor = (status) => {
    const colors = {
      confirmed: '#22C55E', // Plus vif
      seated: '#16A34A', // Plus vif
      completed: '#8B5CF6',
      pending: '#FACC15', // Plus vif
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
      // Auto-group tables for larger parties
      let tablesToAssign = [];

      if (draggedBooking.partySize <= table.capacity) {
        tablesToAssign = [table._id];
      } else {
        // Find adjacent tables to group
        const selectedTables = findAdjacentTables(table, draggedBooking.partySize);
        if (selectedTables.length === 0) {
          alert('Cannot find enough adjacent tables for this party size.');
          return;
        }
        tablesToAssign = selectedTables.map(t => t._id);
      }

      const response = await apiService.bookings.updateBooking(draggedBooking._id, {
        tables: tablesToAssign
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

  // Find adjacent tables for grouping
  const findAdjacentTables = (initialTable, requiredCapacity) => {
    const availableTables = tables.filter(t =>
      t.section === initialTable.section &&
      !getTableStatus(t).booking
    );

    let selectedTables = [initialTable];
    let totalCapacity = initialTable.capacity;

    // Sort by distance to initial table
    availableTables.sort((a, b) => {
      const posA = getTablePosition(a);
      const posB = getTablePosition(b);
      const distA = Math.sqrt(
        Math.pow(posA.x - getTablePosition(initialTable).x, 2) +
        Math.pow(posA.y - getTablePosition(initialTable).y, 2)
      );
      const distB = Math.sqrt(
        Math.pow(posB.x - getTablePosition(initialTable).x, 2) +
        Math.pow(posB.y - getTablePosition(initialTable).y, 2)
      );
      return distA - distB;
    });

    // Add adjacent tables until we have enough capacity
    for (const table of availableTables) {
      if (totalCapacity >= requiredCapacity) break;

      const distance = getDistanceBetweenTables(initialTable, table);
      if (distance < 150) { // Only group truly adjacent tables
        selectedTables.push(table);
        totalCapacity += table.capacity;
      }
    }

    return totalCapacity >= requiredCapacity ? selectedTables : [];
  };

  const getDistanceBetweenTables = (table1, table2) => {
    const pos1 = getTablePosition(table1);
    const pos2 = getTablePosition(table2);
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) +
      Math.pow(pos2.y - pos1.y, 2)
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

  const renderRestaurantElements = () => {
    const { sections } = restaurantLayout;

    return (
      <>
        {/* Main Dining Room Header */}
        <g transform={`translate(${sections.mainDining.x + 10}, ${sections.mainDining.y - 10})`}>
          <TableIcon size={24} className="text-blue-600 inline-block mr-2" />
          <text className="text-lg font-medium fill-gray-800">{sections.mainDining.label}</text>
        </g>

        {/* Main Dining Room */}
        <rect
          x={sections.mainDining.x}
          y={sections.mainDining.y}
          width={sections.mainDining.width}
          height={sections.mainDining.height}
          fill={sections.mainDining.background}
          stroke="#e2e8f0"
          strokeWidth="2"
          rx="8"
        />

        {/* Window decoration for dining room */}
        <rect
          x={sections.mainDining.x}
          y={sections.mainDining.y}
          width={sections.mainDining.width}
          height="8"
          fill="#bfdbfe"
          opacity="0.5"
        />

        {/* Visual separators for table sections */}
        <line
          x1={sections.mainDining.x + 20}
          y1={sections.mainDining.y + 140}
          x2={sections.mainDining.x + sections.mainDining.width - 20}
          y2={sections.mainDining.y + 140}
          stroke="#e2e8f0"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
        <line
          x1={sections.mainDining.x + 20}
          y1={sections.mainDining.y + 220}
          x2={sections.mainDining.x + sections.mainDining.width - 20}
          y2={sections.mainDining.y + 220}
          stroke="#e2e8f0"
          strokeWidth="1"
          strokeDasharray="5,5"
        />

        {/* Outdoor Terrace Header */}
        <g transform={`translate(${sections.outdoor.x + 10}, ${sections.outdoor.y - 10})`}>
          <Umbrella size={24} className="text-green-600 inline-block mr-2" />
          <text className="text-lg font-medium fill-gray-800">{sections.outdoor.label}</text>
        </g>

        {/* Outdoor terrace central walkway */}
        <line
          x1={sections.outdoor.x + sections.outdoor.width / 2}
          y1={sections.outdoor.y + 20}
          x2={sections.outdoor.x + sections.outdoor.width / 2}
          y2={sections.outdoor.y + sections.outdoor.height - 20}
          stroke="#a7f3d0"
          strokeWidth="2"
          strokeDasharray="10,5"
          opacity="0.5"
        />

        {/* Outdoor Terrace */}
        <rect
          x={sections.outdoor.x}
          y={sections.outdoor.y}
          width={sections.outdoor.width}
          height={sections.outdoor.height}
          fill={sections.outdoor.background}
          stroke="#a7f3d0"
          strokeWidth="2"
          rx="8"
        />

        {/* Outdoor decoration */}
        <defs>
          <pattern id="outdoorPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#a7f3d0" opacity="0.3" />
          </pattern>
        </defs>
        <rect
          x={sections.outdoor.x}
          y={sections.outdoor.y}
          width={sections.outdoor.width}
          height={sections.outdoor.height}
          fill="url(#outdoorPattern)"
          opacity="0.8"
        />
      </>
    );
  };

  const renderTable = (table) => {
    const position = getTablePosition(table);
    const { status, color: statusColor, booking } = getTableStatus(table);
    const isSelected = selectedTable?._id === table._id;
    const isDragOver = dragOverTable === table._id;
    const bookingColor = booking ? getBookingColor(booking._id) : null;
    const displayColor = bookingColor || statusColor;

    let displayLabel = table.tableNumber || '';
    let hoverTitle = `${displayLabel} - ${table.capacity} seats`;
    if (booking) {
      hoverTitle += ` - ${booking.partySize} guests - Status: ${booking.status}`;
    }

    console.log(`Table ${table.tableNumber} position: x=${position.x}, y=${position.y}`);

    return (
      <g
        key={table._id}
        transform={`translate(${position.x}, ${position.y})`}
        className="cursor-pointer"
        onClick={() => handleTableClick(table)} // Click to open table actions
        onDragOver={(e) => handleTableDragOver(table, e)}
        onDragLeave={() => setDragOverTable(null)}
        onDrop={(e) => handleTableDrop(table, e)}
        onMouseEnter={() => booking && setHoveredBooking(booking._id)}
        onMouseLeave={() => setHoveredBooking(null)}
      >
        <title>{hoverTitle}</title> {/* Tooltip on hover */}
        {position.shape === 'circle' ? (
          <>
            <circle
              cx="0"
              cy="0"
              r={position.size / 2}
              fill={status === 'available' ? '#ffffff' : `${displayColor}20`}
              stroke={status === 'available' ? '#9CA3AF' : displayColor}
              strokeWidth={isSelected ? 3 : 2}
              className={`transition-all ${isDragOver ? 'stroke-primary stroke-[3]' : ''}`}
            />
            {/* Icône de statut */}
            {booking && status === 'confirmed' && <Check size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-600" />}
            {booking && status === 'seated' && <User size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-600" />}
            {booking && status === 'pending' && <Clock size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-600" />}
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
              fill={status === 'available' ? '#ffffff' : `${displayColor}20`}
              stroke={status === 'available' ? '#9CA3AF' : displayColor}
              strokeWidth={isSelected ? 3 : 2}
              rx="6"
              className={`transition-all ${isDragOver ? 'stroke-primary stroke-[3]' : ''}`}
            />
            {/* Icône de statut */}
            {booking && status === 'confirmed' && <Check size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-600" />}
            {booking && status === 'seated' && <User size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-600" />}
            {booking && status === 'pending' && <Clock size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-600" />}
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

        {/* Table number with indoor/outdoor prefix */}
        <text
          y="-5"
          textAnchor="middle"
          className="text-xs font-bold fill-gray-700"
        >
          {displayLabel}
        </text>

        {/* Capacity info */}
        <text
          y={booking ? '10' : '15'}
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
            fill={displayColor}
          >
            {booking.partySize} guests
          </text>
        )}
      </g>
    );
  };

  // Render connections between grouped tables
  const renderTableConnections = () => {
    const connections = [];

    bookings.forEach(booking => {
      if (booking.tables && booking.tables.length > 1 && booking.status !== 'cancelled' && booking.status !== 'no-show') {
        const bookingTables = tables.filter(table =>
          booking.tables.some(t => t._id === table._id)
        );
        const bookingColor = getBookingColor(booking._id); // Get the unique booking color

        // Create connections between adjacent tables
        for (let i = 0; i < bookingTables.length - 1; i++) {
          for (let j = i + 1; j < bookingTables.length; j++) {
            const table1 = bookingTables[i];
            const table2 = bookingTables[j];
            const pos1 = getTablePosition(table1);
            const pos2 = getTablePosition(table2);

            const distance = Math.sqrt(
              Math.pow(pos2.x - pos1.x, 2) +
              Math.pow(pos2.y - pos1.y, 2)
            );

            // Only connect tables that are close to each other
            if (distance < 150) {
              connections.push(
                <line
                  key={`${booking._id}-${i}-${j}`}
                  x1={pos1.x}
                  y1={pos1.y}
                  x2={pos2.x}
                  y2={pos2.y}
                  stroke={bookingColor} // Use the unique booking color
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  opacity={hoveredBooking === booking._id ? 1 : 0.5}
                />
              );
            }
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
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Floor Plan */}
      <div className="lg:flex-1 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Restaurant Floor Plan</h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              <span className="font-medium">A1-A15:</span> Main Dining
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-medium">O1-O11:</span> Outdoor Terrace
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <Clock size={16} className="mr-1" />
              {moment(selectedTime, 'HH:mm').format('h:mm A')}
            </div>
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
          <svg
            viewBox={`0 0 ${restaurantLayout.dimensions.width} ${restaurantLayout.dimensions.height}`}
            className="w-full h-auto min-h-[500px]"
            style={{ aspectRatio: `${restaurantLayout.dimensions.width}/${restaurantLayout.dimensions.height}` }}
          >
            {/* Restaurant Elements */}
            {renderRestaurantElements()}

            {/* Table Connections */}
            {renderTableConnections()}

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
      <div className="lg:w-80 space-y-6">
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
            <h4 className="font-medium mb-3">
              Table {parseInt(selectedTable.tableNumber) < 50 ?
                `A${selectedTable.tableNumber}` :
                `O${parseInt(selectedTable.tableNumber) - 49}`
              }
            </h4>
            <div className="space-y-3">
              <div className="text-sm">
                <span className="text-gray-500">Capacity:</span> {selectedTable.capacity} guests
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Location:</span> {selectedTable.section === 'outdoor' ? 'Outdoor Terrace' : 'Main Dining'}
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
              <span className="text-gray-500">Indoor Tables:</span>
              <span className="font-medium">
                {tables.filter(t => (!t.section || t.section === 'indoor') && !getTableStatus(t).booking).length}/
                {tables.filter(t => !t.section || t.section === 'indoor').length}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Outdoor Tables:</span>
              <span className="font-medium">
                {tables.filter(t => t.section === 'outdoor' && !getTableStatus(t).booking).length}/
                {tables.filter(t => t.section === 'outdoor').length}
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
