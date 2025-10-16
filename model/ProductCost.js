import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const ProductSchema = new Schema({
  productId: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
  },
});

const ProductCostSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    required: true, 
    unique: true, // one entry per user
    ref: "User",
  },
  products: [ProductSchema],
});

const ProductCost = mongoose.model("ProductCost", ProductCostSchema);
export default ProductCost;