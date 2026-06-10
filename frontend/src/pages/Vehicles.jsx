import { useState, useEffect } from 'react';
import { vehicleService } from '../api/services';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_model: '', vehicle_license: '', vehicle_type: 'car',
    vehicle_length: '', vehicle_width: '', vehicle_height: '',
    driver_name: '', driver_phone: '', driver_license: '',
    vehicle_image: null
  });

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    const { data } = await vehicleService.getAll();
    setVehicles(data.results);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null) data.append(key, formData[key]);
    });
    await vehicleService.create(data);
    setShowForm(false);
    fetchVehicles();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold">My Vehicles</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded">
          {showForm ? 'Cancel' : 'Add Vehicle'}
        </button>
        <input placeholder="Search by license..." className="border p-2 rounded" 
          onChange={async (e) => {
            if(e.target.value.length > 2) {
              const { data } = await vehicleService.search(e.target.value);
              setVehicles(data.results);
            } else { fetchVehicles(); }
          }} 
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded mb-6 grid grid-cols-2 gap-4">
          <input placeholder="Model" className="p-2 border rounded" onChange={e => setFormData({...formData, vehicle_model: e.target.value})} required />
          <input placeholder="License Plate" className="p-2 border rounded" onChange={e => setFormData({...formData, vehicle_license: e.target.value})} required />
          <select className="p-2 border rounded" onChange={e => setFormData({...formData, vehicle_type: e.target.value})}>
            <option value="car">Car</option><option value="bike">Bike</option><option value="bus">Bus</option>
          </select>
          <input type="file" className="p-2 border rounded" onChange={e => setFormData({...formData, vehicle_image: e.target.files[0]})} />
          <input placeholder="Driver Name" className="p-2 border rounded" onChange={e => setFormData({...formData, driver_name: e.target.value})} required />
          <input placeholder="Driver Phone" className="p-2 border rounded" onChange={e => setFormData({...formData, driver_phone: e.target.value})} required />
          <button type="submit" className="col-span-2 bg-green-600 text-white p-2 rounded">Save Vehicle</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {vehicles.map(v => (
          <div key={v.id} className="border p-4 rounded shadow bg-white">
            <h3 className="font-bold text-lg">{v.vehicle_model} ({v.vehicle_type})</h3>
            <p className="text-gray-600">License: {v.vehicle_license}</p>
            <p className="text-sm">Driver: {v.driver_name}</p>
          </ div>
        ))}
      </div>
    </div>
  );
}