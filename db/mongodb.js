
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;

mongoose.connect(uri).then(() => {
  console.log('Connected to MongoDB');
}
).catch(err => {
    console.log('Error connecting to MongoDB:', err.message);
})

export default mongoose;