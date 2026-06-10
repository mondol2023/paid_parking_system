import { useState, useEffect } from 'react';
import { lotService, bookingService } from '../api/services';

export default function ParkingLots() {
  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookingData, setBookingData] = useState({ vehicle: '', reserve_time: 2 });

  useEffect(() => {
    // Auto-fetch nearest lots on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { data } = await lotService.getNearest(
          position.coords.latitude, position.coords.longitude
        );
        setLots(data.results);
      });
    }
  }, []);

  const loadSlots = async (lotId) => {
    setSelectedLot(lotId);
    const { data } = await lotService.getSlots(lotId, true); // Only available
    setSlots(data.slots);
  };

  const handleBooking = async (slotId) => {
    try {
      await bookingService.create({
        vehicle: bookingData.vehicle,
        slot: slotId,
        reserve_time: bookingData.reserve_time
      });
      alert('Booking created successfully!');
      loadSlots(selectedLot); // Refresh slots
    } catch (err) {
      alert('Booking failed: ' + (err.response?.data?.error || 'Unknown error'));
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Nearby Parking Lots</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {lots.map(lot => (
          <div key={lot.id} className="border p-4 rounded shadow cursor-pointer hover:bg-blue-50" onClick={() => loadSlots(lot.id)}>
            <h3 className="font-bold">{lot.name}</h3>
            <p className="text-sm text-gray-600">{lot.address}</p>
            <p className="text-green-600 font-semibold">{lot.distance_km} km away</p>
          </div>
        ))}
      </div>

      {selectedLot && (
        <div className="bg-gray-50 p-4 rounded">
          <h3 className="font-bold mb-4">Available Slots</h3>
          <div className="mb-4 flex gap-4">
            <select className="p-2 border rounded" onChange={e => setBookingData({...bookingData, vehicle: e.target.value})}>
              <option value="">Select Vehicle</option>
              {/* You would map your vehicles here */}
              <option value="1">My Car (ABC-123)</option> 
            </select>
            <input type="number" placeholder="Hours" className="p-2 border rounded w-24" 
              onChange={e => setBookingData({...bookingData, reserve_time: e.target.value})} defaultValue={2} />
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {slots.map(slot => (
              <button key={slot.id} onClick={() => handleBooking(slot.id)} 
                className="bg-green-500 text-white p-3 rounded hover:bg-green-600">
                {slot.slot_number}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}