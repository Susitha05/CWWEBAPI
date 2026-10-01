const mongoose = require('mongoose');

const readingSchema = new mongoose.Schema({
  installation: 
  { 
    type: Number, 
    ref: 'Installation', 
    required: true, 
    index: true 
},
  timestamp: 
    { 
    type: Date,
     required: true, 
     index: true 
    },
  powerKw: 
  { 
    type: Number,
    required: true 
    
  },      
  energyKwh: 
  { 
    type: Number, 
    required: true
 },  
  voltage: 
  { 
    type: Number, 
    required: true 
}
}, 
{ timestamps: { createdAt: true, updatedAt: false } });


readingSchema.index({ installation_id: 1, timestamp: -1 });

module.exports = mongoose.model('Reading', readingSchema);
