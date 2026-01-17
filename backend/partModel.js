import mongoose from 'mongoose';

const partSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },
    brand: { type: String, default: "" },
    price: { type: String, default: "$0" },
    image: { type: String, default: "" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('Part', partSchema);
