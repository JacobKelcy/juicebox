const express = require("express");
const postsRouter = express.Router();
const { getAllPosts } = require("../db");

module.exports = postsRouter;

postsRouter.get("/", async (req, res) => {
  const posts = await getAllPosts();
  res.send({ posts });
});
