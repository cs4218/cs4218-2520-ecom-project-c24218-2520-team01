import mongoose from "mongoose";

// Bugs fixed by Nicholas Cheng, A0269648H

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  slug: {
    type: String,
    lowercase: true,
    required: true,
    unique: true,
  },
});

export default mongoose.model("Category", categorySchema);