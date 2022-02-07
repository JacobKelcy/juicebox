const express = require("express");
const postsRouter = express.Router();
const { getAllPosts, createPost } = require("../db");
const { requireUser } = require("./utils");

module.exports = postsRouter;

postsRouter.get("/", async (req, res) => {
  const posts = await getAllPosts();
  res.send({ posts });
});

postsRouter.post("/", requireUser, async (req, res, next) => {
  const { title, content, tags = "" } = req.body;
  let postData = {};
  const tagArr = tags.trim().split(/\s+/);

  if (tagArr.length) {
    postData.tags = tagArr;
  }

  try {
    postData = { ...postData, authorId: req.user.id, title, content };
    const post = await createPost(postData);

    console.log("post", post);

    if (post) {
      // code breaks here: unable to res.send
      res.send({ post });
      // Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
    } else {
      next({
        name: "PostCreationError",
        message: "Post creation failed! :(",
      });
    }
  } catch (error) {
    next(error);
  }
});

// postsRouter.post("/", requireUser, async (req, res, next) => {
// console.log(req.body);
// res.send(req.body);
//   const tagArr = tags.trim().split(/\s+/);
//   const postData = {};
//   // only send the tags if there are some to send
//   if (tagArr.length) {
//     postData.tags = tagArr;
//   }
//   try {
//     // add authorId, title, content to postData object
//     postData = { ...postData, authorId: req.user.id, title, content };
//     const post = await createPost(postData);
//     if (post) {
//       res.send({ post });
//     } else {
//       next({
//         name: "PostCreationError",
//         message: "Post creation failed",
//       });
//     }
//     // const post = await createPost(postData);
//     // this will create the post and the tags for us
//     // if the post comes back, res.send({ post });
//     // otherwise, next an appropriate error object
//   } catch ({ name, message }) {
//     next({ name, message });
//   }
// });
