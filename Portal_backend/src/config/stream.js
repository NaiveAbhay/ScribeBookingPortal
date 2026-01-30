import { StreamChat } from "stream-chat";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  throw new Error("Stream keys missing in .env");
}

// 1. Export the client (Used by Chat Controller)
export const streamClient = StreamChat.getInstance(apiKey, apiSecret);

// 2. Export Token Generator (Used by Login/Chat)
export const generateStreamToken = (userId) => {
  return streamClient.createToken(userId);
};

// 3. Export User Syncer (RESTORED - Used by Register)
export const upsertStreamUser = async (user) => {
  try {
    await streamClient.upsertUser({
      id: user.id.toString(),
      name: `${user.first_name} ${user.last_name || ""}`.trim(),
      email: user.email,
      image: user.profile_image_url || `https://ui-avatars.com/api/?name=${user.first_name}+${user.last_name}`,
      role: "user" 
    });
  } catch (error) {
    console.error("Error syncing user to Stream:", error);
    // We don't throw here to prevent breaking the registration flow if Stream fails
  }
};