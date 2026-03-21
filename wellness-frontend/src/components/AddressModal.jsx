import { useState } from "react";

export default function AddressModal({ currentAddress, currentPhone, onConfirm, onClose }) {
  const parseAddress = (addr) => {
    const defaultAddr = { houseNo: '', area: '', district: '', state: '' };
    if (!addr) return defaultAddr;
    
    // Check if it's our structured format
    const match = addr.match(/House No: (.*?), Area: (.*?), District: (.*?), State: (.*)/);
    if (match) {
      return {
        houseNo: match[1],
        area: match[2],
        district: match[3],
        state: match[4]
      };
    }
    // If it's unstructured, put everything in area
    return { ...defaultAddr, area: addr };
  };

  const [address, setAddress] = useState(parseAddress(currentAddress));
  const [phone, setPhone] = useState(currentPhone || "");
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleConfirm = () => {
    if (!address.houseNo.trim() || !address.area.trim() || !address.district.trim() || !address.state.trim()) {
      setError("Please fill in all address fields");
      return;
    }
    if (phone && phone.length !== 10) {
      setError("Phone number must be exactly 10 digits");
      return;
    }
    const formattedAddress = `House No: ${address.houseNo.trim()}, Area: ${address.area.trim()}, District: ${address.district.trim()}, State: ${address.state.trim()}`;
    onConfirm(formattedAddress, phone);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            {currentAddress ? "Confirm Delivery Address" : "Enter Delivery Address"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            &times;
          </button>
        </div>

        {!currentAddress && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ No address found in your profile. Please provide an address to deliver your order.
            </p>
          </div>
        )}

        <div className="mb-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">House No. / Flat</label>
              <input
                type="text"
                value={address.houseNo}
                onChange={(e) => handleChange('houseNo', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border-gray-300"
                placeholder="Ex: 4A"
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Area / Village Name</label>
              <input
                type="text"
                value={address.area}
                onChange={(e) => handleChange('area', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border-gray-300"
                placeholder="Ex: Downtown"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">District</label>
              <input
                type="text"
                value={address.district}
                onChange={(e) => handleChange('district', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border-gray-300"
                placeholder="Ex: North District"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">State</label>
              <input
                type="text"
                value={address.state}
                onChange={(e) => handleChange('state', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border-gray-300"
                placeholder="Ex: CA"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (Optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPhone(value);
                    setError("");
                }}
                maxLength="10"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border-gray-300"
                placeholder="Ex: 9876543210"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
          >
            {currentAddress ? "Confirm & Place Order" : "Save & Place Order"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
