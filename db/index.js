const { Client } = require('pg') // imports the pg module

const client = new Client('postgres://localhost:5432/juicebox-dev');

/**
 * USER Methods
 */

async function createUser({ 
  username, 
  password,
  name,
  location
}) {
  try {
    const { rows: [ user ] } = await client.query(`
      INSERT INTO users(username, password, name, location) 
      VALUES($1, $2, $3, $4) 
      ON CONFLICT (username) DO NOTHING 
      RETURNING *;
    `, [username, password, name, location]);

    return user;
  } catch (error) {
    throw error;
  }
}

async function updateUser(id, fields = {}) {
  // build the set string
  const setString = Object.keys(fields).map(
    (key, index) => `"${ key }"=$${ index + 1 }`
  ).join(', ');

  // return early if this is called without fields
  if (setString.length === 0) {
    return;
  }

  try {
    const { rows: [ user ] } = await client.query(`
      UPDATE users
      SET ${ setString }
      WHERE id=${ id }
      RETURNING *;
    `, Object.values(fields));

    return user;
  } catch (error) {
    throw error;
  }
}

async function getAllUsers() {
  try {
    const { rows } = await client.query(`
      SELECT id, username, name, location, active 
      FROM users;
    `);

    return rows;
  } catch (error) {
    throw error;
  }
}

async function getUserById(userId) {
  try {
    const { rows: [ user ] } = await client.query(`
      SELECT id, username, name, location, active
      FROM users
      WHERE id=${ userId }
    `);

    if (!user) {
      return null
    }

    user.posts = await getPostsByUser(userId);

    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * POST Methods
 */

async function createPost({
  authorId,
  title,
  content
}) {
  try {
    const { rows: [ post ] } = await client.query(`
      INSERT INTO posts("authorId", title, content) 
      VALUES($1, $2, $3)
      RETURNING *;
    `, [authorId, title, content]);

    return post;
  } catch (error) {
    throw error;
  }
}

async function updatePost(id, fields = {}) {
  // build the set string
  const setString = Object.keys(fields).map(
    (key, index) => `"${ key }"=$${ index + 1 }`
  ).join(', ');

  // return early if this is called without fields
  if (setString.length === 0) {
    return;
  }

  try {
    const { rows: [ post ] } = await client.query(`
      UPDATE posts
      SET ${ setString }
      WHERE id=${ id }
      RETURNING *;
    `, Object.values(fields));

    return post;
  } catch (error) {
    throw error;
  }
}

async function getAllPosts() {
  try {
    const { rows } = await client.query(`
      SELECT *
      FROM posts;
    `);

    return rows;
  } catch (error) {
    throw error;
  }
}

async function getPostsByUser(userId) {
  try {
    const { rows } = await client.query(`
      SELECT * 
      FROM posts
      WHERE "authorId"=${ userId };
    `);

    return rows;
  } catch (error) {
    throw error;
  }
}

async function getPostById(postId) {
  try {
    const { rows: [ post ]  } = await client.query(`
      SELECT *
      FROM posts
      WHERE id=$1;
    `, [postId]);

    //select tags from particular post by joining all tags in the tags table on all post_tags records in the post_tags through table 
    //if -> WHERE post_tags record tagId matches the postId
    //this allows to grab only the tags associated with a particular post
    //since theres a many:many (many to many) relation here
    //we need to make sure that tags dont end up in an exclusive relation with any given post
     const { rows: tags } = await client.query(`
      SELECT tags.*
      FROM tags
      JOIN post_tags ON tags.id=post_tags."tagId"
      WHERE post_tags."postId"=$1;
    `, [postId])

      const { rows: [author] } = await client.query(`
      SELECT id, username, name, location
      FROM users
      WHERE id=$1;
    `, [post.authorId])
      post.tags = tags;
      post.author = author;

      //delete is a special keyword that completely removes a key (ie, a field)
      //from an object
      delete post.authorId;

      //before deleting we had: post = { bunch of stuff..., author: INT }
      //after deleting, post = { ... }, auhtorId has been completely removed

      return post;
    } catch (err) {
      throw err;
    }
}

module.exports = {  
  client,
  createUser,
  updateUser,
  getAllUsers,
  getUserById,
  createPost,
  updatePost,
  getAllPosts,
  createTags,
  addTagsToPosts,
};

//////////
//TAGS
/////////

//tagList: ['#tagOne', '#tagTwo', ...]
async function createTags(tagList) {
  if (tagList.length === 0) { 
    return; 
  }

    // <---> this is the join that will create our comma-seperated tuples
    // ($1), ($2), ($3)
    const insertValues = tagList.map((_, idx) => `$${idx + 1}`.join('), ('))

    const selectValues = tagList.map((_, idx) => `$${idx + 1}`).join(", ");

    try {
    // insert the tags, doing nothing on conflict
    // returning nothing, we'll query after
    await client.query(`
      INSERT INTO TAGS(name)
      VALUES (${insertValues})
      ON CONFLICT (name) DO NOTHING
      returning *;
      
    `,
    tagList
    );
    // select all tags where the name is in our taglist
    // return the rows from the query
      const {rows} = await client.query(`
      SELECT * FROM tags
      WHERE tags.name in (${selectValues});
      `,
      tagList
      );

      return rows;
    } catch (err) {
      throw err;
    }
}


/////
//POST_TAG THROUGH TABLE
////

async function createPostTag(postId, tagId){
    try{
    await client.query(`
    INSERT INTO post_tags("postId", "tagId")
    VALUES ($1, $2)
    ON CONFLICT ("postId", "tagId") DO NOTHING;
    `, [postId, tagId]//we need array literal here because our postid and tagid are both strings
    );
   }catch(err) {
    throw err;
    
    }
}

async function addTagsToPosts(postId, tagList){
    try{
        //this promise will need to be resolved
        const createPostTagPromises = tagList.map((tag) => 
        createPostTag(postId, tag.id)
        );

    //in order to resolve a LIST or ARRAY of promises we use Promise.all
      await Promise.all(createPostTagPromises);

    return await getPostById(postId);
  } catch (error) {
    throw error;
  }
}