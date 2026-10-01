const mongoose = require('mongoose');
const { Schema } = mongoose;

const provinceSchema = new Schema(
  {
    province_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt, useful for Last-Modified headers
    versionKey: false,
  }
);

provinceSchema.set('toJSON', {
  virtuals: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

const districtShema = new Schema(
  {
    district_id:{
      type: Number,
      unique:true,
      index:true,
      require:true
    },
    province_id:{
      type:Number,
      require:true,
      ref:'Province'
    },
    name:{
      type:String,
      require:true
    },
  }
);

districtShema.set('toJSON', {
  virtuals: false,
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

const Province = mongoose.model('Province', provinceSchema);
const District = mongoose.model('District',districtShema);

module.exports = {Province,District}