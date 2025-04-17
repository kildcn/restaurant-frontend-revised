import React, { useState, useEffect, useRef } from 'react';
import { Clock, User, Mail, Phone, Menu, Users, AlertCircle, Layers, Save, RefreshCw, Plus, X, Calendar, Filter, Edit, Check, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import apiService from '../services/api';
import moment from 'moment';

const FloorPlan = ({ date, bookings, updateBookingStatus }) => {
  const [floorPlanData, setFloorPlanData] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [unassignedBookings, setUnassignedBookings] = useState([]);
  const [draggedBooking, setDraggedBooking] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('status'); // 'standard', 'capacity', 'status'
  const [editMode, setEditMode] = useState(false);
  const [timeFilter, setTimeFilter] = useState('current'); // 'all', 'current', 'upcoming'
  const [timeSlotView, setTimeSlotView] = useState(''); // Default will be set based on restaurant hours
  const [section, setSection] = useState('all'); // 'all', 'indoor', 'outdoor', 'bar', 'private'
  const [hoveredTable, setHoveredTable] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('evening'); // 'lunch', 'evening', 'all-day'
  const [timeSlots, setTimeSlots] = useState([]);
  const [activeTimeSlotIndex, setActiveTimeSlotIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [tableAssignments, setTableAssignments] = useState({});
  const [attentionNeeded, setAttentionNeeded] = useState([]);

  const floorPlanRef = useRef(null);

  // Reset selection when date changes
  useEffect(() => {
    setSelectedTable(null);
    setSelectedBooking(null);
    fetchFloorPlanData();

    // Set current time in HH:MM format
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);

      // Find the nearest time slot to current time and set it as active
      if (timeSlots.length > 0) {
        const currentTimeMinutes = hours * 60 + parseInt(minutes);
        let closestSlotIndex = 0;
        let minDiff = Infinity;

        timeSlots.forEach((slot, index) => {
          const slotHours = parseInt(slot.split(':')[0]);
          const slotMinutes = parseInt(slot.split(':')[1]);
          const slotTotalMinutes = slotHours * 60 + slotMinutes;

          const diff = Math.abs(currentTimeMinutes - slotTotalMinutes);
          if (diff < minDiff) {
            minDiff = diff;
            closestSlotIndex = index;
          }
        });

        if (timeFilter === 'current') {
          setActiveTimeSlotIndex(closestSlotIndex);
          setTimeSlotView(timeSlots[closestSlotIndex]);
        }
      }
    };

    updateTime();
    // Update time every minute
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [date, timeSlots]);

  // Generate time slots when restaurant info is loaded
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      generateTimeSlots();
    }
  }, [bookings]);

  // Update unassigned bookings when bookings change
  useEffect(() => {
    if (bookings) {
      updateUnassignedBookings();
      updateTableAssignments();
      identifyBookingsNeedingAttention();
    }
  }, [bookings, timeSlotView, timeFilter]);

  // Generate time slots from restaurant hours
  const generateTimeSlots = () => {
    // For this example, we'll use fixed times from 18:00 to 23:00 with 30-minute intervals
    // In a real implementation, this would come from restaurant settings
    const startHour = 18;
    const endHour = 23;
    const intervalMinutes = 30;

    const slots = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute}`);
      }
    }

    setTimeSlots(slots);

    // Set default time slot view to the first slot
    if (slots.length > 0 && !timeSlotView) {
      setTimeSlotView(slots[0]);
    }
  };

  // Update which bookings are unassigned
  const updateUnassignedBookings = () => {
    if (!bookings) return;

    // Filter bookings for the currently selected time slot
    const relevantBookings = bookings.filter(booking => {
      const bookingTime = moment(booking.timeSlot.start).format('HH:mm');

      if (timeFilter === 'all') return true;
      if (timeFilter === 'current') {
        return bookingTime === timeSlotView;
      }
      if (timeFilter === 'upcoming') {
        return moment(bookingTime, 'HH:mm').isAfter(moment(timeSlotView, 'HH:mm'));
      }
      return true;
    });

    const unassigned = relevantBookings.filter(booking =>
      !booking.tables || booking.tables.length === 0
    );

    setUnassignedBookings(unassigned);
  };

  // Update table assignments for the current time view
  const updateTableAssignments = () => {
    if (!bookings || !floorPlanData) return;

    const assignments = {};

    // For each table, find bookings at the current time
    floorPlanData.forEach(table => {
      const tableBookings = bookings.filter(booking => {
        if (!booking.tables) return false;

        const bookingStart = moment(booking.timeSlot.start).format('HH:mm');
        const bookingEnd = moment(booking.timeSlot.end).format('HH:mm');
        const currentViewTime = timeSlotView;

        const isInTimeRange =
          (timeFilter === 'all') ||
          (timeFilter === 'current' && bookingStart === currentViewTime) ||
          (timeFilter === 'upcoming' && moment(bookingStart, 'HH:mm').isAfter(moment(currentViewTime, 'HH:mm')));

        return booking.tables.some(t => t._id === table._id) && isInTimeRange;
      });

      if (tableBookings.length > 0) {
        assignments[table._id] = tableBookings[0];
      }
    });

    setTableAssignments(assignments);
  };

  // Identify bookings that need attention (late arrivals, etc.)
  const identifyBookingsNeedingAttention = () => {
    if (!bookings) return;

    const now = new Date();

    // Find bookings that are late (more than 15 minutes past start time and not seated)
    const lateBookings = bookings.filter(booking => {
      const bookingStart = new Date(booking.timeSlot.start);
      const fifteenMinutesLate = new Date(bookingStart.getTime() + 15 * 60000);
      return now > fifteenMinutesLate && booking.status !== 'seated' && booking.status !== 'completed' && booking.status !== 'cancelled' && booking.status !== 'no-show';
    });

    setAttentionNeeded(lateBookings);
  };

  const fetchFloorPlanData = async () => {
    setIsLoading(true);

    try {
      const response = await apiService.tables.getTables();

      if (response.success) {
        // Create a floor plan with positions for each table
        const tablesWithPositions = assignTablePositions(response.data || []);
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

  // Function to assign positions to tables with improved layout
  const assignTablePositions = (tables) => {
    if (!tables || !tables.length) {
      return [];
    }

    // Group tables by section
    const sections = {
      indoor: [],
      outdoor: [],
      bar: [],
      private: [],
      window: []
    };

    // Sort tables by table number within each section
    tables.forEach(table => {
      const section = table.section || 'indoor';
      if (sections[section]) {
        sections[section].push(table);
      } else {
        sections.indoor.push(table);
      }
    });

    // Sort each section by table number
    Object.keys(sections).forEach(section => {
      sections[section].sort((a, b) => {
        const aNum = parseInt(a.tableNumber.replace(/\D/g, '')) || 0;
        const bNum = parseInt(b.tableNumber.replace(/\D/g, '')) || 0;
        return aNum - bNum;
      });
    });

    // Position indoor tables in a more realistic restaurant layout
    const positionedTables = [];

    // Indoor tables - grid layout with staggered rows
    const indoorRows = Math.ceil(sections.indoor.length / 4);
    sections.indoor.forEach((table, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      // Add staggering for more natural look
      const xOffset = row % 2 === 0 ? 0 : 20;

      const size = getTableSize(table.capacity);
      const shape = table.capacity > 4 ? 'rect' : 'round';

      positionedTables.push({
        ...table,
        x: 120 + xOffset + (col * 160),
        y: 130 + (row * 120),
        width: shape === 'rect' ? size * 1.5 : size,
        height: size,
        shape: shape
      });
    });

    // Window tables along the left side
    sections.window.forEach((table, index) => {
      const size = getTableSize(table.capacity);
      positionedTables.push({
        ...table,
        x: 40,
        y: 140 + (index * 100),
        width: size,
        height: size,
        shape: 'round'
      });
    });

    // Bar tables along the right side
    sections.bar.forEach((table, index) => {
      const size = getTableSize(table.capacity);
      positionedTables.push({
        ...table,
        x: 740,
        y: 140 + (index * 80),
        width: size,
        height: size,
        shape: 'round'
      });
    });

    // Private tables in a separate area
    sections.private.forEach((table, index) => {
      const size = getTableSize(table.capacity);
      positionedTables.push({
        ...table,
        x: 600 - (index * 30),
        y: 450 + (index * 20),
        width: size * 1.5,
        height: size,
        shape: 'rect'
      });
    });

    // Outdoor tables - grid layout
    const outdoorCols = 5;
    sections.outdoor.forEach((table, index) => {
      const row = Math.floor(index / outdoorCols);
      const col = index % outdoorCols;

      const size = getTableSize(table.capacity);
      const shape = table.capacity > 4 ? 'rect' : 'round';

      positionedTables.push({
        ...table,
        x: 100 + (col * 140),
        y: 600 + (row * 110),
        width: shape === 'rect' ? size * 1.5 : size,
        height: size,
        shape: shape
      });
    });

    return positionedTables;
  };

  // Determine table size based on capacity
  const getTableSize = (capacity) => {
    if (capacity <= 2) return 50;
    if (capacity <= 4) return 60;
    if (capacity <= 6) return 70;
    if (capacity <= 8) return 80;
    return 90; // For larger tables
  };

  const handleTableClick = (table) => {
    setSelectedTable(table);

    // Find booking associated with this table for the current time slot
    const tableBooking = tableAssignments[table._id];
    setSelectedBooking(tableBooking || null);
  };

  // Handle drag start for booking
  const handleDragStart = (booking, e) => {
    setDraggedBooking(booking);
    // Set a custom drag image
    if (e.dataTransfer) {
      const dragIcon = document.createElement('div');
      dragIcon.innerHTML = `<div style="padding: 10px; background: #3B82F6; color: white; border-radius: 4px;">${booking.customer.name} (${booking.partySize})</div>`;
      document.body.appendChild(dragIcon);
      e.dataTransfer.setDragImage(dragIcon, 0, 0);
      setTimeout(() => document.body.removeChild(dragIcon), 0);
    }
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
        // For demo purposes - update local state
        // In real implementation, refetch booking data after assignment
        const updatedAssignments = { ...tableAssignments };
        updatedAssignments[tableId] = draggedBooking;
        setTableAssignments(updatedAssignments);

        // Remove from unassigned
        setUnassignedBookings(prev => prev.filter(b => b._id !== draggedBooking._id));

        // Toast notification
        alert(`Booking for ${draggedBooking.customer.name} assigned to table!`);
      } else {
        console.error("Error assigning booking to table:", response.error);
        alert("Error assigning booking to table");
      }
    } catch (error) {
      console.error("Error assigning booking to table:", error);
      alert("Error assigning booking to table");
    }

    setDraggedBooking(null);
  };

  // Format time for display (ISO -> 6:00 PM)
  const formatTime = (isoTime) => {
    if (!isoTime) return '';
    const date = new Date(isoTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get table status and color based on bookings and current time slot view
  const getTableStatus = (tableId) => {
    const booking = tableAssignments[tableId];

    // Default status if no booking is assigned
    if (!booking) {
      return { status: 'available', color: '#E5E7EB', textColor: '#111827' };
    }

    // Check if booking is for current time
    const bookingStart = new Date(booking.timeSlot.start);
    const bookingEnd = new Date(booking.timeSlot.end);
    const now = new Date();

    const isNow = now >= bookingStart && now <= bookingEnd;

    // Calculate how much time has passed since the booking started (for gradient effect)
    const totalDuration = bookingEnd - bookingStart;
    const elapsedTime = now - bookingStart;
    const progressPercent = Math.min(100, Math.max(0, (elapsedTime / totalDuration) * 100));

    // Use status-based colors with opacity for non-current bookings
    switch (booking.status) {
      case 'seated':
        return {
          status: 'seated',
          color: isNow ? '#22C55E' : 'rgba(34, 197, 94, 0.7)',
          gradient: isNow ? `linear-gradient(90deg, #22C55E ${progressPercent}%, rgba(34, 197, 94, 0.5) 100%)` : null,
          textColor: '#FFFFFF',
          booking: booking
        };
      case 'confirmed':
        return {
          status: 'confirmed',
          color: isNow ? '#3B82F6' : 'rgba(59, 130, 246, 0.7)',
          textColor: '#FFFFFF',
          booking: booking
        };
      case 'pending':
        return {
          status: 'pending',
          color: isNow ? '#FBBF24' : 'rgba(251, 191, 36, 0.7)',
          textColor: '#111827',
          booking: booking
        };
      case 'cancelled':
        return {
          status: 'cancelled',
          color: isNow ? '#EF4444' : 'rgba(239, 68, 68, 0.7)',
          textColor: '#FFFFFF',
          booking: booking
        };
      case 'no-show':
        return {
          status: 'no-show',
          color: isNow ? '#9CA3AF' : 'rgba(156, 163, 175, 0.7)',
          textColor: '#FFFFFF',
          booking: booking
        };
      default:
        return {
          status: 'reserved',
          color: isNow ? '#8B5CF6' : 'rgba(139, 92, 246, 0.7)',
          textColor: '#FFFFFF',
          booking: booking
        };
    }
  };

  // Find tables that are part of the same booking
  const getGroupedTables = (tableId) => {
    const booking = tableAssignments[tableId];
    if (!booking || !booking.tables || booking.tables.length <= 1) return [];

    // Return other tables in this booking
    return booking.tables
      .filter(t => t._id !== tableId)
      .map(t => t._id);
  };

  // Filter tables based on current section filter
  const filteredTables = section === 'all'
    ? floorPlanData
    : floorPlanData.filter(table => table.section === section);

  // Handle time slot change
  const handleTimeSlotChange = (index) => {
    setActiveTimeSlotIndex(index);
    setTimeSlotView(timeSlots[index]);
    // Reset selections when changing time
    setSelectedTable(null);
    setSelectedBooking(null);
    // Update table assignments for the new time
    updateTableAssignments();
  };

  // Go to previous time slot
  const handlePrevTimeSlot = () => {
    if (activeTimeSlotIndex > 0) {
      handleTimeSlotChange(activeTimeSlotIndex - 1);
    }
  };

  // Go to next time slot
  const handleNextTimeSlot = () => {
    if (activeTimeSlotIndex < timeSlots.length - 1) {
      handleTimeSlotChange(activeTimeSlotIndex + 1);
    }
  };

  // Handle zoom in/out
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 1.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  // Check if a booking needs attention
  const needsAttention = (booking) => {
    return attentionNeeded.some(b => b._id === booking._id);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center">
          <h3 className="text-xl font-semibold">Floor Plan</h3>
          <span className="ml-2 text-sm text-gray-500">
            {date ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Current time indicator */}
          <div className="flex items-center text-sm bg-white px-3 py-1 rounded-full shadow-sm border">
            <Clock size={16} className="mr-1 text-primary" />
            <span>Current time: {currentTime}</span>
          </div>

          {/* Time filter */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setTimeFilter('current')}
              className={`px-3 py-1 text-sm ${timeFilter === 'current'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-r-0'}`}
            >
              Current
            </button>
            <button
              onClick={() => setTimeFilter('upcoming')}
              className={`px-3 py-1 text-sm ${timeFilter === 'upcoming'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border border-r-0'}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1 text-sm ${timeFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-700 border'}`}
            >
              All Day
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={handleZoomOut}
              className="px-3 py-1 text-sm bg-white border border-r-0 text-gray-700"
              title="Zoom out"
            >
              −
            </button>
            <div className="px-3 py-1 text-sm bg-white border border-r-0 text-gray-700">
              {Math.round(zoomLevel * 100)}%
            </div>
            <button
              onClick={handleZoomIn}
              className="px-3 py-1 text-sm bg-white border text-gray-700"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Time slot selector - horizontal scrollable */}
      <div className="relative bg-white p-2 rounded-lg shadow-sm">
        <div className="flex items-center">
          <button
            onClick={handlePrevTimeSlot}
            className="p-1 rounded hover:bg-gray-100"
            disabled={activeTimeSlotIndex === 0}
          >
            <ChevronLeft size={20} className={activeTimeSlotIndex === 0 ? "text-gray-300" : "text-gray-600"} />
          </button>

          <div className="flex-1 flex overflow-x-auto py-2 hide-scrollbar justify-center">
            <div className="flex space-x-1">
              {timeSlots.map((timeSlot, index) => (
                <button
                  key={timeSlot}
                  onClick={() => handleTimeSlotChange(index)}
                  className={`px-4 py-2 rounded-md whitespace-nowrap transition-all ${
                    index === activeTimeSlotIndex
                      ? 'bg-primary text-white scale-110'
                      : 'bg-white text-gray-700 border hover:bg-gray-50'
                  }`}
                >
                  {moment(timeSlot, 'HH:mm').format('h:mm A')}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleNextTimeSlot}
            className="p-1 rounded hover:bg-gray-100"
            disabled={activeTimeSlotIndex === timeSlots.length - 1}
          >
            <ChevronRight size={20} className={activeTimeSlotIndex === timeSlots.length - 1 ? "text-gray-300" : "text-gray-600"} />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Floor Plan Area */}
        <div
          ref={floorPlanRef}
          className="flex-1 border border-gray-200 rounded-lg bg-white p-4 relative overflow-auto"
          style={{ minHeight: '600px' }}
        >
          {/* Section filters */}
          <div className="absolute top-2 left-4 flex space-x-1 z-20">
            <button
              onClick={() => setSection('all')}
              className={`text-xs px-2 py-1 rounded ${section === 'all' ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              All
            </button>
            <button
              onClick={() => setSection('indoor')}
              className={`text-xs px-2 py-1 rounded ${section === 'indoor' ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              Indoor
            </button>
            <button
              onClick={() => setSection('window')}
              className={`text-xs px-2 py-1 rounded ${section === 'window' ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              Window
            </button>
            <button
              onClick={() => setSection('bar')}
              className={`text-xs px-2 py-1 rounded ${section === 'bar' ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              Bar
            </button>
            <button
              onClick={() => setSection('outdoor')}
              className={`text-xs px-2 py-1 rounded ${section === 'outdoor' ? 'bg-primary text-white' : 'bg-gray-100'}`}
            >
              Outdoor
            </button>
          </div>

          {/* Time indicator banner */}
          <div className="absolute top-2 right-4 z-20">
            <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
              Viewing: {moment(timeSlotView, 'HH:mm').format('h:mm A')}
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-30">
              <div className="text-center">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-300 border-t-primary rounded-full mb-2"></div>
                <p>Loading floor plan...</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {floorPlanData.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <AlertCircle size={24} className="mx-auto mb-2" />
                <p>No table data available</p>
              </div>
            </div>
          )}

          {/* Floor plan canvas with zoom applied */}
          <div
            className="relative min-h-[800px] min-w-full"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top left',
              width: 'fit-content',
              height: 'fit-content'
            }}
          >
            {/* Section labels */}
            {filteredTables.some(t => t.section === 'indoor') && (
              <div className="absolute top-10 left-10 bg-gray-100 px-2 py-1 rounded text-xs font-medium z-10">
                Indoor Area
              </div>
            )}

            {filteredTables.some(t => t.section === 'window') && (
              <div className="absolute top-10 left-40 bg-gray-100 px-2 py-1 rounded text-xs font-medium z-10">
                Window
              </div>
            )}

            {filteredTables.some(t => t.section === 'bar') && (
              <div className="absolute top-10 right-20 bg-gray-100 px-2 py-1 rounded text-xs font-medium z-10">
                Bar
              </div>
            )}

            {filteredTables.some(t => t.section === 'outdoor') && (
              <div className="absolute top-[550px] left-10 bg-gray-100 px-2 py-1 rounded text-xs font-medium z-10">
                Outdoor Area
              </div>
            )}

            {filteredTables.some(t => t.section === 'private') && (
              <div className="absolute top-[450px] right-40 bg-gray-100 px-2 py-1 rounded text-xs font-medium z-10">
                Private
              </div>
            )}

            {/* Tables */}
            {filteredTables.map(table => {
              const { status, color, textColor, gradient, booking } = getTableStatus(table._id);
              const groupedTables = getGroupedTables(table._id);
              const isGrouped = groupedTables.length > 0;
              const isHovered = hoveredTable === table._id;
              const hasAttention = booking && needsAttention(booking);

              // Determine what text to display in the table based on view mode
              let displayText = table.tableNumber;
              if (viewMode === 'capacity') {
                displayText = table.capacity;
              } else if (viewMode === 'status' && booking) {
                displayText = booking.partySize;
              }

              // Apply subtle animation for tables that need attention
              const pulseAnimation = hasAttention ? 'animate-pulse' : '';

              return (
                <div
                  key={table._id}
                  className={`absolute flex items-center justify-center cursor-pointer transition-all duration-200 ${
                    selectedTable && selectedTable._id === table._id ? 'ring-2 ring-offset-2 ring-primary shadow-lg' : ''
                  } ${pulseAnimation}`}
                  style={{
                    left: `${table.x}px`,
                    top: `${table.y}px`,
                    width: `${table.width}px`,
                    height: `${table.height}px`,
                    backgroundColor: color,
                    background: gradient || color,
                    color: textColor,
                    borderRadius: table.shape === 'round' ? '50%' : '4px',
                    border: isGrouped ? '2px dashed #b22222' : hasAttention ? '2px solid #ef4444' : 'none',
                    boxShadow: isHovered || (selectedTable && selectedTable._id === table._id) ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
                    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    zIndex: selectedTable && selectedTable._id === table._id ? 50 : isHovered ? 40 : 10
                  }}
                  onClick={() => handleTableClick(table)}
                  onMouseEnter={() => setHoveredTable(table._id)}
                  onMouseLeave={() => setHoveredTable(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleTableDrop(table._id)}
                >
                  <div className="text-xs font-medium">{displayText}</div>

                  {/* Show booking info as a tooltip on hover */}
                  {(isHovered || (selectedTable && selectedTable._id === table._id)) && booking && (
                    <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-white rounded p-2 shadow-lg text-black text-xs z-50 whitespace-nowrap">
                      <div className="font-bold">{booking.customer.name}</div>
                      <div>{booking.partySize} guests at {formatTime(booking.timeSlot.start)}</div>
                      <div className={`text-xs ${getStatusColor(booking.status)}`}>{capitalizeFirstLetter(booking.status)}</div>
                    </div>
                  )}

                  {/* Show party size for tables with bookings */}
                  {viewMode === 'standard' && booking && (
                    <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-gray-600">
                      {booking.partySize}p
                    </div>
                  )}

                  {/* Show time for tables with bookings */}
                  {viewMode === 'status' && booking && (
                    <div className="absolute -bottom-5 left-0 right-0 text-center text-xs text-gray-600">
                      {formatTime(booking.timeSlot.start)}
                    </div>
                  )}

                  {/* Attention indicator */}
                  {hasAttention && (
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white z-20 animate-ping"></div>
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
                className="absolute bottom-4 right-4 bg-primary text-white p-3 rounded-full shadow-lg hover:bg-primary-dark transition-colors z-20"
                onClick={() => {/* Implement add table functionality */}}
              >
                <Plus size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Bookings & Details */}
        <div className="lg:w-80">
          {/* Status Legend */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
            <h4 className="font-medium mb-2 text-sm uppercase text-gray-500">Table Status</h4>
            <div className="grid grid-cols-3 gap-2">
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

          {/* Attention Needed */}
          {attentionNeeded.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm mb-4">
              <h4 className="font-medium mb-2 text-sm uppercase text-red-700 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                Attention Needed ({attentionNeeded.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-auto">
                {attentionNeeded.map((booking) => (
                  <div
                    key={booking._id}
                    className="p-2 border border-red-200 rounded bg-white cursor-pointer hover:bg-red-50"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-medium text-sm">{booking.customer.name}</div>
                      <div className="text-xs bg-red-100 text-red-800 px-1 rounded">{formatTime(booking.timeSlot.start)}</div>
                    </div>
                    <div className="text-xs text-red-700 mt-0.5">
                      {booking.partySize} guests • {calculateLateTime(booking.timeSlot.start)} late
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unassigned Bookings */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
            <h4 className="font-medium mb-2 text-sm uppercase text-gray-500 flex items-center justify-between">
              <span>Unassigned Bookings</span>
              <Filter size={14} className="text-gray-400" />
            </h4>
            {unassignedBookings.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-auto">
                {unassignedBookings.map((booking) => (
                  <div
                    key={booking._id}
                    className="p-2 border border-gray-200 rounded bg-gray-50 cursor-pointer hover:bg-gray-100"
                    draggable
                    onDragStart={(e) => handleDragStart(booking, e)}
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
                No unassigned bookings for this time
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
                  <X size={16} />
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
                  <X size={16} />
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
      </div>
    </div>
  );
};

// Helper functions
const getStatusColor = (status) => {
  switch(status) {
    case 'confirmed': return 'text-blue-600';
    case 'seated': return 'text-green-600';
    case 'pending': return 'text-yellow-600';
    case 'completed': return 'text-purple-600';
    case 'cancelled': return 'text-red-600';
    case 'no-show': return 'text-gray-600';
    default: return 'text-gray-600';
  }
};

const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const calculateLateTime = (startTime) => {
  const start = new Date(startTime);
  const now = new Date();
  const diffMinutes = Math.floor((now - start) / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
};

export default FloorPlan;
