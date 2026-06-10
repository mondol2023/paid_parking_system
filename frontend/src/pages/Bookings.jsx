import { useState, useEffect } from 'react';
import { bookingService, paymentService } from '../api/services';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [payingBooking, setPayingBooking] = useState(null);
  const [payMethod, setPayMethod] = useState('cash');

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    const { data } = await bookingService.getAll();
    setBookings(data);
  };

  const handleCheckout = async (id) => {
    try {
      const { data } = await bookingService.checkout(id);
      alert(`Checkout successful! Final Amount: $${data.final_amount}`);
      setPayingBooking(data); // Trigger payment modal
      fetchBookings();
    } catch (err) {
      alert('Checkout failed');
    }
  };

  const handlePayment = async () => {
    try {
      await paymentService.confirm(payingBooking.booking_id, {
        payment_method: payMethod,
        transaction_id: payMethod === 'mobile_banking' ? 'TXN12345' : '' // Simplified for demo
      });
      alert('Payment successful!');
      setPayingBooking(null);
      fetchBookings();
    } catch (err) {
      alert('Payment failed');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Active Bookings</h2>
      <div className="space-y-4">
        {bookings.map(b => (
          <div key={b.id} className="border p-4 rounded shadow flex justify-between items-center">
            <div>
              <p className="font-bold">Booking #{b.id} - Slot {b.slot.slot_number}</p>
              <p className="text-sm text-gray-600">Vehicle: {b.vehicle.vehicle_license} | Status: {b.status}</p>
            </div>
            {b.status === 'active' && (
              <button onClick={() => handleCheckout(b.id)} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                Checkout & Pay
              </button>
            )}
          </div>
        ))}
      </div>

      {payingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Complete Payment</h3>
            <p className="mb-4">Amount Due: <span className="font-bold text-green-600">${payingBooking.final_amount}</span></p>
            <select className="w-full p-2 border rounded mb-4" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Credit/Debit Card</option>
              <option value="mobile_banking">Mobile Banking</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handlePayment} className="flex-1 bg-green-600 text-white p-2 rounded">Confirm Payment</button>
              <button onClick={() => setPayingBooking(null)} className="flex-1 bg-gray-300 p-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}