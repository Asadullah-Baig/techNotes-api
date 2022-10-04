const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const { json } = require("express");

//@desc Get all Users
//@route GET /users
//@access Private

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").lean();
  if (!users?.length) {
    return res.status(400).json({ message: "No users found!" });
  }
  res.json(users);
});

//@desc create new user
//@route POST /users
//@access Private

const createNewUser = asyncHandler(async (req, res) => {
  const { username, password, roles } = req.body;

  //confirming data
  if (!username || !password) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  //check for duplicates
  const duplicate = await User.findOne({ username })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    res.status(409).json({ message: "Username Already Registered!" });
  } else {
    //Hash password recieved
    const hashedPwd = await bcrypt.hash(password, 10); //salt rounds

    const userObject =
      (!Array.isArray(roles) || !roles.length)
        ? { username, password: hashedPwd }
        : { username, password: hashedPwd, roles};

    //create and store new user

    const user = await User.create(userObject);

    if (user) {
      //created
      res
        .status(201)
        .json({ message: `New User ${username} has been Registered!` });
    } else {
      res.status(400).json({ message: ` Invalid user data recieved!` });
    }
  }
});

//@desc update user
//@route PATCH /users/:id
//@access Private

const updateUser = asyncHandler(async (req, res) => {
  const { id, username, roles, active, password } = req.body;

  //Confirm data
  if (
    !id ||
    !username ||
    !Array.isArray(roles) ||
    !roles.length ||
    typeof active !== "boolean"
  ) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    res.status(400).json({ message: "user not found!" });
  } else {
    //check for duplicate username
    const duplicate = await User.findOne({ username })
      .collation({ locale: "en", strength: 2 })
      .lean()
      .exec();
    //Allow updates to the original user
    if (duplicate && duplicate?._id.toString() !== id) {
      return res.status(409).json({ message: "Duplicate username!" });
    }

    user.username = username;
    user.roles = roles;
    user.active = active;

    if (password) {
      //Hash new Password
      user.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await user.save();

    res.status(200).json({ message: `${updatedUser.username} updated!` });
  }
});

//@desc delete user
//@route DELETE /users/:id
//@access Private

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: `User ID Required!` });
  }

  const note = await Note.findOne({ user: id }).lean().exec();
  if (note) {
    return res
      .status(400)
      .json({ message: "User with notes Can't be Deleted!" });
  }

  const user = await User.findById(id).exec();
  if (!user) {
    return res.status(400).json({ message: "User not Found!" });
  }

  const result = await user.deleteOne();

  const reply = `Username ${result.username} with ID ${result._id} has been Deleted!`;

  res.status(200).json(reply);
});

module.exports = { getAllUsers, createNewUser, updateUser, deleteUser };
