import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, AlignJustify } from 'lucide-react';

const BookingForm = () => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [availableTimes, setAvailableTimes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    // Set the default date to today
    const today = new Date();
    // Format as YYYY-MM-DD
    const formattedDate = today.toISOString().split('T')[0];
    setDate(formattedDate);
  }, []);

  // When date changes, fetch available times
  useEffect(() => {
    if (date) {
      fetchAvailableTimes();
    }
  }, [date, guests]);

  const fetchAvailableTimes = async () => {
    setIsLoading(true);
    // This would normally fetch from your API
    // Simulating API call with static data for now
    setTimeout(() => {
      // These times would come from your backend based on availability
      const mockTimes = [
        { value: '18:00', label: '6:00 PM', endTime: '8:00 PM' },
        { value: '18:15', label: '6:15 PM', endTime: '8:15 PM' },
        { value: '18:30', label: '6:30 PM', endTime: '8:30 PM' },
        { value: '18:45', label: '6:45 PM', endTime: '8:45 PM' },
        { value: '19:00', label: '7:00 PM', endTime: '9:00 PM' },
        { value: '19:15', label: '7:15 PM', endTime: '9:15 PM' },
        { value: '19:30', label: '7:30 PM', endTime: '9:30 PM' },
        { value: '19:45', label: '7:45 PM', endTime: '9:45 PM' },
        { value: '20:15', label: '8:15 PM', endTime: '10:15 PM' },
        { value: '20:30', label: '8:30 PM', endTime: '10:30 PM' },
        { value: '20:45', label: '8:45 PM', endTime: '10:45 PM' },
        { value: '21:00', label: '9:00 PM', endTime: '11:00 PM' },
        { value: '21:15', label: '9:15 PM', endTime: '11:15 PM' },
        { value: '21:30', label: '9:30 PM', endTime: '11:30 PM' },
        { value: '21:45', label: '9:45 PM', endTime: '11:45 PM' },
      ];

      // Filter out some times based on day of week to simulate availability
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay();

      // Only show times if day is Wed-Sat (3-6)
      if (dayOfWeek >= 3 && dayOfWeek <= 6) {
        // Randomly remove some times to simulate limited availability
        const filteredTimes = mockTimes.filter(() => Math.random() > 0.3);
        setAvailableTimes(filteredTimes);
      } else {
        setAvailableTimes([]);
        setMessage({
          text: 'We are closed on this day. We are open Wednesday through Saturday.',
          type: 'error'
        });
      }

      setIsLoading(false);
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    // Validation
    if (guests > 6) {
      setMessage({
        text: 'For parties of 7 or more, please email us at restaurantleustache@gmail.com',
        type: 'error'
      });
      setIsLoading(false);
      return;
    }

    // This would be an API call to your backend
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulating a successful booking
      setMessage({
        text: 'Your reservation has been confirmed! A confirmation email has been sent to your inbox.',
        type: 'success'
      });

      // Reset form after successful submission
      setTime('');
      setSpecialRequests('');
    } catch (error) {
      setMessage({
        text: 'There was an error processing your reservation. Please try again.',
        type: 'error'
      });
    }

    setIsLoading(false);
  };

  // Calculate the minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  // Calculate the maximum date (30 days from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {message.text && (
        <div
          className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Selection */}
          <div>
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <Calendar className="mr-2 text-primary" size={18} />
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={today}
              max={maxDateStr}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <User className="mr-2 text-primary" size={18} />
              Number of Guests
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
              ))}
              <option disabled value={7}>For 7+ guests, please email us</option>
            </select>
          </div>

          {/* Time Selection */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <Clock className="mr-2 text-primary" size={18} />
              Select a Time
            </label>

            {isLoading ? (
              <div className="text-center p-4">Loading available times...</div>
            ) : availableTimes.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {availableTimes.map((timeSlot) => (
                  <div key={timeSlot.value}>
                    <input
                      type="radio"
                      id={`time-${timeSlot.value}`}
                      name="time"
                      value={timeSlot.value}
                      checked={time === timeSlot.value}
                      onChange={() => setTime(timeSlot.value)}
                      className="sr-only"
                      required
                    />
                    <label
                      htmlFor={`time-${timeSlot.value}`}
                      className={`block text-center p-2 rounded-md cursor-pointer border transition-colors
                        ${time === timeSlot.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'}`}
                    >
                      <div>{timeSlot.label}</div>
                      <div className="text-xs mt-1">Until {timeSlot.endTime}</div>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-100 rounded-md text-gray-700">
                {message.text || 'No available times for the selected date.'}
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div>
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <User className="mr-2 text-primary" size={18} />
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <Mail className="mr-2 text-primary" size={18} />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <Phone className="mr-2 text-primary" size={18} />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              required
            />
          </div>

          {/* Special Requests */}
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-medium mb-2 flex items-center">
              <AlignJustify className="mr-2 text-primary" size={18} />
              Special Requests (optional)
            </label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              rows={3}
            ></textarea>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            type="submit"
            className="w-full md:w-auto px-6 py-3 rounded-md text-white font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary-dark transition-colors"
            disabled={isLoading || !time || availableTimes.length === 0}
          >
            {isLoading ? 'Processing...' : 'Confirm Reservation'}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600 text-center">
          By making a reservation, you agree to our 2-hour table policy.
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
