import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri || (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://"))) {
      throw new Error("MONGODB_URI is missing or invalid. Use a mongodb:// or mongodb+srv:// connection string in Backend/.env");
    }

    const connectionInstance = await mongoose.connect(`${mongoUri}/${DB_NAME}`);
    console.log(`\n MongoDB connected: ${connectionInstance.connection.host} \n`);
  } catch (error) {
    console.log("MongoDB connection error:", error.message || error);
    process.exit(1);
  }
};

export default connectDB;
