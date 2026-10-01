const mongoose = require('mongoose');
const { Schema } = mongoose;

const installationSchema = new Schema({
    installation_id: {
        type: Number,
        required: true,
        unique: true
    },

    reference_no: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    owner_name: {
        type: String,
        required: true
    },

    owner_type: {
        type: String,
        required: true
    },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  apiKey: 
  {
     type: String, 
     required: true, 
     unique: true, 
     index: true 
},

    substation_id: {
        type: Number,
        required: true,
        ref: "Station"
    },

    capacity_kwp: {
        type: Number,
        required: true
    },

    inverter_capacity_kw: {
        type: Number,
        required: true
    },

    panel_wattage_w: {
        type: Number,
        required: true
    },

    commissioned_date: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        required: true
    }
});

installationSchema.set('toJSON',{
    virtuals:false,
    transform:(_doc,rat)=>{
        delete rat._id;
        return rat
    }
});

module.exports = new mongoose.model('Installation',installationSchema);