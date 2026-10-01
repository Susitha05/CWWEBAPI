const mongoose = require('mongoose');
const { Schema } = mongoose;

const stationSchema = new Schema({
    substation_id: {
        type: Number,
        required: true,
        unique: true
    },

    code: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true
    },

    district_id: {
        type: Number,
        required: true,
        ref: "District"
    },

    voltage_level: {
        type: String,
        required: true
    },

    transformer_capacity_mva: {
        type: Number,
        required: true
    },

    number_of_feeders: {
        type: Number,
        required: true
    },

    commissioned_date: {
        type: Date,
        required: true
    },

    operator: {
        type: String,
        required: true
    },

    status: {
        type: String,
        required: true
    }
});


stationSchema.set('toJSON',{
    virtuals:false,
    transform:(_doc,rat)=>{
        delete rat._id;
        return rat
    }
});

module.exports= new mongoose.model('Station',stationSchema);