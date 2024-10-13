const express = require("express");
//const { chats } = require("./data/data");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
dotenv.config();
connectDB();

app.use(express.json());

app.use("/chatSphere/user", userRoutes);
app.use("/chatSphere/chat", chatRoutes);
app.use("/chatSphere/message", messageRoutes);

const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("API is Running");
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
  5000,
  console.log(`server now running on port ${PORT}`)
);

const io = require("socket.io")(server, {
  pingTimeout: 80000,
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  socket.on("setup", (userData) => {
    userData && socket.join(userData._id);
    socket.emit("connected");
    console.log("websocket connected!!");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("user joined Room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));
  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) {
      console.log("chat users not defined");
    }

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) {
        return;
      }

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("user Disconnected");
    socket.leave(userData._id);
  });
});