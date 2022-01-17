// api/users.js
const express = require("express");
const { user } = require("pg/lib/defaults");
const usersRouter = express.Router();
const { getAllUsers, getUserByUsername } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = process.env; // an object containing all environment variables that were read into memory by our dotenv.consfigure() call

usersRouter.use((req, res, next) => {
  console.log("A request is being made to /users");
  next(); // THIS IS DIFFERENT
});

usersRouter.get("/", async (req, res) => {
  const users = await getAllUsers();

  res.send({
    users,
  });
});

usersRouter.post("/login", async (req, res, next) => {
  const { username, password } = req.body;

  // request must have both
  if (!username || !password) {
    next({
      name: "MissingCredentialsError",
      message: "Please supply both a username and password",
    });
  }

  try {
    const user = await getUserByUsername(username);

    if (user && user.password === password) {
      const response = {
        id: user.id,
        name: user.username,
        token: jwt.sign(
          { id: user.id, username: user.username },
          process.env.JWT_SECRET
        ),
      };

      res.send({ message: "youre logged in", response });
    } else {
      next({
        name: "IncorrectCredentialsError",
        message: "Username or password is incorrect",
      });
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

module.exports = usersRouter;
