const express = require("express");
const { getAllTags } = require("../db");
const tagsRouter = express.Router();

module.exports = tagsRouter;

tagsRouter.get("/", async (req, res) => {
  const tags = await getAllTags();
  res.send({ tags });
});
