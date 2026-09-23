import mongoose from "mongoose";
import User from "./models/User.js";

/* =========================================================
   MONGODB CONNECTION
========================================================= */

const MONGO_URI =
  "mongodb+srv://cryptonfuturemedia1989_db_user:Sd5ke9P1BvgD7pjP@cluster0.a3lrmqv.mongodb.net/asad_portfolio";

/* =========================================================
   CONNECT MONGODB
========================================================= */

try {
  await mongoose.connect(MONGO_URI);

  console.log(
    "MongoDB connected successfully"
  );

  console.log(
    "Database:",
    mongoose.connection.name
  );

  /* =======================================================
     USERS
  ======================================================= */

  const users = [
    {
      userId: "user-001",
      name: "Muhammad Asad",
      email: "asad@example.com",
      avatar: "MA",
      role: "admin",
      online: false,
    },

    {
      userId: "user-002",
      name: "Ahmed Khan",
      email: "ahmed@example.com",
      avatar: "AK",
      role: "user",
      online: false,
    },

    {
      userId: "user-003",
      name: "Ali Raza",
      email: "ali@example.com",
      avatar: "AR",
      role: "user",
      online: false,
    },

    {
      userId: "user-004",
      name: "Visitor",
      email: "visitor@example.com",
      avatar: "V",
      role: "visitor",
      online: false,
    },
  ];

  /* =======================================================
     DELETE OLD USERS
  ======================================================= */

  await User.deleteMany({});

  console.log(
    "Old users deleted successfully"
  );

  /* =======================================================
     INSERT USERS
  ======================================================= */

  await User.insertMany(users);

  console.log(
    "Users seeded successfully"
  );

  console.log(
    `${users.length} users inserted`
  );

} catch (error) {
  console.error(
    "MongoDB error:",
    error.message
  );
} finally {
  /* =======================================================
     CLOSE CONNECTION
  ======================================================= */

  await mongoose.connection.close();

  console.log(
    "MongoDB connection closed"
  );

  process.exit(0);
}