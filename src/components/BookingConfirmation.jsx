import React, { useState } from 'react';
import { Check, Calendar, Clock, User, Mail, Phone, ChevronLeft, Download, AlertCircle } from 'lucide-react';
import moment from 'moment';

const BookingConfirmation = ({ booking, onBack }) => {
  const [copied, setCopied] = useState(false);

  if (!booking) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center text-red-600 mb-4">
          <AlertCircle size={48} className="mx-auto" />
          <h3 className="text-xl font-bold mt-2">Booking Information Not Available</h3>
        </div>
        <p className="text-center mb-4">
          Sorry, we couldn't retrieve your booking information. Please try again.
        </p>
        <div className="text-center">
          <button
            onClick={onBack}
            className="flex items-center justify-center mx-auto px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
          >
            <ChevronLeft size={16} className="mr-2" />
            Back to Booking Form
          </button>
        </div>
      </div>
    );
  }

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'confirmed':
        return { text: 'Confirmed', className: 'text-green-600' };
      case 'pending':
        return { text: 'Pending Confirmation', className: 'text-yellow-600' };
      case 'seated':
        return { text: 'Seated', className: 'text-blue-600' };
      case 'completed':
        return { text: 'Completed', className: 'text-purple-600' };
      case 'cancelled':
        return { text: 'Cancelled', className: 'text-red-600' };
      case 'no-show':
        return { text: 'No Show', className: 'text-gray-600' };
      default:
        return { text: 'Unknown Status', className: 'text-gray-600' };
    }
  };

  // Get booking reference (last 6 characters of ID)
  const bookingReference = booking.id?.slice(-6).toUpperCase() || booking._id?.slice(-6).toUpperCase() || 'N/A';

  // Format date and time
  const formattedDate = moment(booking.date).format('dddd, MMMM D, YYYY');
  const startTime = moment(booking.timeSlot.start).format('h:mm A');
  const endTime = moment(booking.timeSlot.end).format('h:mm A');

  // For add to calendar functionality
  const formatCalendarDate = (date) => {
    return moment(date).format('YYYYMMDDTHHmmss');
  };

  const generateICalendar = () => {
    const start = formatCalendarDate(booking.timeSlot.start);
    const end = formatCalendarDate(booking.timeSlot.end);

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//L'Eustache//Restaurant Booking//EN
BEGIN:VEVENT
UID:${booking.id || booking._id}@leustache.com
DTSTAMP:${formatCalendarDate(new Date())}
DTSTART:${start}
DTEND:${end}
SUMMARY:Reservation at L'Eustache
DESCRIPTION:Reservation for ${booking.partySize} people\\nReference: ${bookingReference}\\n${booking.specialRequests ? 'Special requests: ' + booking.specialRequests : ''}
LOCATION:Weisestraße 49, 12049 Berlin
END:VEVENT
END:VCALENDAR`;
  };

  const handleAddToCalendar = () => {
    const icalContent = generateICalendar();
    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reservation-leustache-${bookingReference}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyReferenceToClipboard = () => {
    navigator.clipboard.writeText(bookingReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center">
  <div className="bg-green-100 w-20 h-20 mx-auto rounded-full flex items-center justify-center">
    <Check size={40} />
  </div>
  {booking.status === 'pending' ? (
    <h3 className="text-2xl font-bold mt-4 text-yellow-600">Reservation Pending!</h3>
  ) : (
    <h3 className="text-2xl font-bold mt-4 text-green-600">Reservation Confirmed!</h3>
  )}
  <p className={`mt-2 ${getStatusDisplay(booking.status).className}`}>
    Status: {getStatusDisplay(booking.status).text}
  </p>
</div>

      <p className="text-center mb-6">
        A confirmation email has been sent to <span className="font-semibold">{booking.customer.email}</span>
      </p>

      <div className="bg-primary-light bg-opacity-10 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Booking Reference:</span>
          <button
            onClick={copyReferenceToClipboard}
            className="text-primary hover:text-primary-dark flex items-center text-sm"
          >
            {bookingReference}
            <span className="ml-2 text-xs">
              {copied ? 'Copied!' : 'Copy'}
            </span>
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-1">
          Please save this reference for any future changes.
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 mb-6">
        <h4 className="font-semibold mb-4 text-lg border-b pb-2">Reservation Details</h4>

        <div className="space-y-4">
          <div className="flex items-start">
            <Calendar className="text-primary mr-3 mt-1 flex-shrink-0" size={18} />
            <div>
              <div className="font-medium">{formattedDate}</div>
            </div>
          </div>

          <div className="flex items-start">
            <Clock className="text-primary mr-3 mt-1 flex-shrink-0" size={18} />
            <div>
              <div className="font-medium">{startTime} - {endTime}</div>
              <div className="text-sm text-gray-600">2-hour dining time</div>
            </div>
          </div>

          <div className="flex items-start">
            <User className="text-primary mr-3 mt-1 flex-shrink-0" size={18} />
            <div>
              <div className="font-medium">{booking.partySize} {booking.partySize === 1 ? 'guest' : 'guests'}</div>
              <div className="text-sm text-gray-600">{booking.customer.name}</div>
            </div>
          </div>

          <div className="flex items-start">
            <Phone className="text-primary mr-3 mt-1 flex-shrink-0" size={18} />
            <div>{booking.customer.phone}</div>
          </div>

          <div className="flex items-start">
            <Mail className="text-primary mr-3 mt-1 flex-shrink-0" size={18} />
            <div>{booking.customer.email}</div>
          </div>

          {booking.specialRequests && (
            <div className="border-t pt-4 mt-4">
              <div className="font-medium mb-1">Special Requests:</div>
              <div className="text-gray-700">{booking.specialRequests}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
        <button
          onClick={onBack}
          className="flex items-center justify-center px-4 py-2 border border-primary text-primary rounded hover:bg-primary-light hover:bg-opacity-10 transition-colors"
        >
          <ChevronLeft size={16} className="mr-2" />
          Back to Booking
        </button>

        <button
          onClick={handleAddToCalendar}
          className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
        >
          <Calendar size={16} className="mr-2" />
          Add to Calendar
        </button>
      </div>

      <div className="mt-6 text-center text-sm text-gray-600">
        Need to modify or cancel your reservation?<br />
        Please contact us at <a href="mailto:restaurantleustache@gmail.com" className="text-primary hover:underline">restaurantleustache@gmail.com</a> or call us at <a href="tel:01635172664" className="text-primary hover:underline">0163 5172664</a>
      </div>
    </div>
  );
};

export default BookingConfirmation;
