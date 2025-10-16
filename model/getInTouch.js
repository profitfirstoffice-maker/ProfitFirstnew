import mongoose from 'mongoose';

const { Schema } = mongoose;

const getInTouchSchema = new Schema({
  name: String,
  email: String,
  message: String,
  phone: String,
  website: String,
}, {
  timestamps: true
  
});

const GetInTouch = mongoose.model('GetInTouch', getInTouchSchema);

export default GetInTouch;