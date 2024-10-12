const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

//* Middleware
app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//* MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//* Schemas
const exerciseSchema = new mongoose.Schema({
  userId: String,
  username: String,
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
});

const userSchema = new mongoose.Schema({
  username: String,
});

//* Models
const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

//* Endpoints

// Delete all users
app.get("/api/users/delete", async (_req, res) => {
  try {
    const result = await User.deleteMany({});
    res.json({ message: "All users have been deleted!", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Deleting all users failed!" });
  }
});

// Delete all exercises
app.get("/api/exercises/delete", async (_req, res) => {
  try {
    const result = await Exercise.deleteMany({});
    res.json({ message: "All exercises have been deleted!", result });
  } catch (err) {
    res.status(500).json({ message: "Deleting all exercises failed!" });
  }
});

// Serve index.html
app.get("/", async (_req, res) => {
  res.sendFile(__dirname + "/views/index.html");
  await User.syncIndexes();
  await Exercise.syncIndexes();
});

// Get all users
app.get("/api/users", async (_req, res) => {
  try {
    const users = await User.find({});
    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found in the database!" });
    }
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Getting all users failed!" });
  }
});

// Create a new user
app.post("/api/users", async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.status(201).json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(500).json({ message: "User creation failed!" });
  }
});

// Add a new exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    const exerciseDate = date || new Date().toISOString().substring(0, 10);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const newExercise = new Exercise({
      userId: user._id,
      username: user.username,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });

    const savedExercise = await newExercise.save();

    res.status(201).json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: new Date(savedExercise.date).toDateString(),
      _id: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Exercise creation failed!" });
  }
});

// Get a user's exercise log
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const exercises = await Exercise.find({
      userId,
      date: {
        $gte: from || new Date(0).toISOString().substring(0, 10),
        $lte: to || new Date(Date.now()).toISOString().substring(0, 10),
      },
    })
      .select("description duration date")
      .limit(Number(limit) || 0);

    const log = exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: new Date(ex.date).toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to retrieve exercise logs" });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
