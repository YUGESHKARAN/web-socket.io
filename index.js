const express = require("express");
const http    = require("http");
const cors    = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();
const mongoose = require("mongoose");

const connectToDatabase = require("./db");

// fix: import BOTH models from the shared normalized schema
// delete the local blogAuthorSchema.js copy — it still has embedded posts
const { Author, Post } = require("./models/blogAuthorSchema")

const PORT = process.env.SOCKET_PORT || 4000;
const app    = express();
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
});

const userSocketMap = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // fix: query Post collection directly — Author "posts._id" dot-query broken after normalization
  socket.on("editMessage", async (data) => {
    const { postId, messageId, message } = data;
    try {
      await Post.updateOne(
        { _id: postId, "messages._id": messageId },
        { $set: { "messages.$[msg].message": message } },
        {
          arrayFilters: [
            { "msg._id": new mongoose.Types.ObjectId(messageId) },
          ],
        }
      );
      io.to(postId).emit("editMessage", { messageId, message });
    } catch (error) {
      console.error("Error in editMessage:", error);
    }
  });

  // fix: $pull directly on Post.messages — "posts.$.messages" positional broken after normalization
  socket.on("deleteMessage", async (data) => {
    const { postId, messageId } = data;
    try {
      await Post.updateOne(
        { _id: postId },
        { $pull: { messages: { _id: new mongoose.Types.ObjectId(messageId) } } }
      );
      io.to(postId).emit("deleteMessage", { messageId });
    } catch (error) {
      console.error("Error in deleteMessage:", error);
    }
  });

  socket.on("registerUser", (email) => {
    userSocketMap.set(email, socket.id);
    console.log(`Registered: ${email} → ${socket.id}`);
  });

  socket.on("joinPostRoom", (postId) => {
    socket.join(postId);
    console.log(`Joined room: ${postId}`);
  });

  socket.on("newMessage", async (data) => {
    const { postId, user, email, url, message, createdAt } = data;

    try {
      // fix: get post author via Post collection — Author.findOne("posts._id") never matched
      const post = await Post.findOne({ _id: postId })
        .populate("authorId", "email")
        .select("authorId");

      if (!post) {
        console.error("Post not found:", postId);
        return;
      }

      const authorEmail = post.authorId?.email;

      // get commenter's profile separately — unchanged
      const authorProfile = await Author.findOne({ email: { $eq: email } }).select("profile");
      const profile = authorProfile?.profile || "";

      const newMessage = {
        _id:       new mongoose.Types.ObjectId(),
        user,
        email,
        message,
        profile,
        timestamp: createdAt || new Date(),
      };

      // fix: push to Post.messages directly — "posts.$.messages" positional broken
      await Post.updateOne(
        { _id: postId },
        { $push: { messages: newMessage } }
      );

      io.to(postId).emit("newMessage", newMessage);

      const notfiMesg = `Commented: ${message}`;
      const notification = {
        postId,
        user,
        message: notfiMesg,
        profile,
        authorEmail,
        url,
        timestamp: new Date(),
      };

      const authorSocketId = userSocketMap.get(authorEmail);
      if (authorSocketId) {
        // user online — emit directly
        io.to(authorSocketId).emit("notification", notification);
        console.log(`Notification sent to: ${authorEmail}`);
      } else {
        // user offline — store in Author.notification (unchanged — still embedded)
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