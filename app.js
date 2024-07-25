const express = require("express");
const app = express();
const path = require("path");
const port = 3000;
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.set("view engine", "ejs");  

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/register", async (req, res) => {
  let { username, name, age, email, password } = req.body;
  // check that this user already exist or not
  let user = await userModel.findOne({ email}); // sort version of userModel.findOne({email: email});
  if (user) {
    return res.status(500).send("user already registered");
  }

  // here i hash my password
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      let user =await userModel.create({
        username,
        name,
        age,
        email,
        password:hash
      });

      let token = jwt.sign({email: email, userid:user._id}, "shhhhh");
      res.cookie("token", token);
      res.send("registered");
    });
  });
});

app.get("/login", async (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  let {email, password } = req.body;
  let user = await userModel.findOne({ email }); // sort version of userModel.findOne({email: email});
  if (!user) {
    return res.status(500).send("something went wrong");
  }

  bcrypt.compare(password, user.password, function(err, result){
    if(result){
      let token = jwt.sign({email: email, userid:user._id}, "shhhhh");
      res.cookie("token", token);
      res.status(200).redirect("profile");
    } 
     else res.redirect("/login");
  });

});

app.get("/profile", isLoggdIn,async (req, res) => {
  let user = await userModel.findOne({email: req.user.email}).populate("post");
  res.render("profile", {user});
});

app.get("/like/:id", isLoggdIn,async (req, res) => {
  let post = await postModel.findOne({_id: req.params.id}).populate("user");

  if(post.likes.indexOf(req.user.userid)=== -1){
    post.likes.push(req.user.userid);
  }
  else{
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();
  res.redirect("/profile");
});

app.get("/edit/:id", isLoggdIn,async (req, res) => {
  let post = await postModel.findOne({_id: req.params.id}).populate("user");
  res.render("edit",{post});
});

app.post("/update/:id", isLoggdIn,async (req, res) => {
  let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});
  res.redirect("/profile");
});

app.post("/post", isLoggdIn,async (req, res) => {
  let user = await userModel.findOne({email: req.user.email});

  let {content} = req.body;
  let post = await postModel.create({
    user: user._id,
    content: content,
  });
  user.post.push(post._id);
  await user.save()
  res.redirect("/profile");
});

app.get("/logout", async (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

function isLoggdIn(req, res, next){
  if(req.cookies.token == "") res.redirect("login");
  else{
    let data = jwt.verify(req.cookies.token, "shhhhh");
    req.user = data;
    next();
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Example app listening on port 3000`);
});
