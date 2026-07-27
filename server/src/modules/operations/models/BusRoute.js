const mongoose = require('mongoose');

const busRouteSchema = new mongoose.Schema({
  routeName: { type: String, required: true },
  busNumber: { type: String, required: true },
  driverName: { type: String, required: true },
  driverPhone: { type: String },
  currentLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  lastUpdated: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'idle', 'maintenance'], default: 'idle' },
  stops: [
    {
      name: { type: String },
      estimatedTime: { type: String },
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('BusRoute', busRouteSchema);
