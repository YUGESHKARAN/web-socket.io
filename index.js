// socketServer.js

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const connectToDatabase = require("./db");
const Author = require("./models/blogAuthorSchema");

const PORT = process.env.SOCKET_PORT || 4000;

const app = express();
const server = http.createServer(app);

connectToDatabase();

app.use(cors({
  origin: [
    "https://blog-frontend-teal-ten.vercel.app",
    "http://localhost:5173",
    "https://mongodb-rag-rho.vercel.app",
  ],
  methods: ["GET", "POST"],
  credentials: true,
}));

const io = new Server(server, {
  cors: {
    origin: [
      "https://blog-frontend-teal-ten.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling"],
});

const userSocketMap = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("registerUser", (email) => {
    userSocketMap.set(email, socket.id);
    console.log(`Registered: ${email} → ${socket.id}`);
  });

  socket.on("joinPostRoom", (postId) => {
    socket.join(postId);
    console.log(`Joined room: ${postId}`);
  });

  socket.on("newMessage", async (data) => {
    const { postId, user, email, url, message } = data;

    try {
      const author = await Author.findOne(
        { "posts._id": postId },
        { email: 1, "posts.$": 1 }
      );

      const authorProfile = await Author.findOne({ email });
      const profile = authorProfile?.profile || "";

      const authorEmail = author.email;
      const newMessage = { user, message, profile };

      await Author.updateOne(
        { "posts._id": postId },
        { $push: { "posts.$.messages": newMessage } }
      );

      socket.to(postId).emit("message", newMessage);

      const notification = {
        postId,
        user,
        message,
        profile,
        authorEmail,
        url,
        timestamp: new Date(),
      };

      const authorSocketId = userSocketMap.get(authorEmail);
      if (authorSocketId) {
        // User online
        io.to(authorSocketId).emit("notification", notification);
        console.log(`Notification sent to: ${authorEmail}`);
      } else {
        // User offline — store
        await Author.updateOne(
          { email: authorEmail },
          { $push: { notification } }
        );
        console.log(`Notification saved for: ${authorEmail}`);
      }
    } catch (error) {
      console.error("Error in newMessage:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    for (let [email, id] of userSocketMap.entries()) {
      if (id === socket.id) {
        userSocketMap.delete(email);
        console.log(`Unregistered: ${email}`);
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
