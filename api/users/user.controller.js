const { create, getUser, updateUser } = require("./user.service");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");
const crypto = require("crypto");
const {
  validateEmail,
  checkForStrongPassword,
  generateHashedPassword,
} = require("../../helpers/helper");
var auth = require("basic-auth");

module.exports = {
  //createUser controller
  createUser: (req, res) => {
    const newUser = req.body;

    if (!newUser.username) {
      return res.status(400).json({
        message: "Username cannot be left blank",
        resolution: "Enter username in valid email address format",
      });
    }
    if (!newUser.password) {
      return res.status(400).json({
        message: "Password cannot be left blank",
        resolution:
          "Strong password should consist of at least 1 lowercase alphabet, 1 uppercase alphabet,1 numeric, 1 special character and eight characters or longer",
      });
    }
    if (!validateEmail(newUser.username)) {
      return res.status(400).json({
        message: "Invalid username format",
        resolution: "Enter username in valid email address format",
      });
    }
    if (!checkForStrongPassword(newUser.password)) {
      return res.status(400).json({
        message: "Password not strong enough",
        resolution:
          "Strong password should consist of at least 1 lowercase alphabet, 1 uppercase alphabet,1 numeric, 1 special character and eight characters or longer",
      });
    }
    newUser.password = generateHashedPassword(newUser.password);
    newUser.id = crypto.randomBytes(16).toString("hex");
    newUser.account_created = new Date();
    newUser.account_updated = new Date();
    //call create service
    create(newUser, (err, results) => {
      if (err) {
        if (err.code == "ER_DUP_ENTRY") {
          return res.status(400).json({
            message: "Username already exists",
            resolution:
              "Enter a different username in valid email address format",
          });
        } else {
          return res.status(500).json({
            message: "Error in processing request",
            resolution: "Contact Administrator if issue persists",
          });
        }
      }
      return res.status(201).send(results);
    });
  },
  getUser: async (req, res) => {
    const username = req.username;
    const password = req.password;

    await getUser(username, password, (err, results) => {
      if (err) {
        return res.status(401).json({
          message: "Authentication failed",
          resolution: "Enter valid Authentication Header",
        });
      }
      if (!results) {
        return res.status(404).json({
          message: "Record not found",
          resolution: "Enter valid Authentication Header",
        });
      }
      return res.send(results);
    });
  },
  updateUser: async (req, res) => {
    if (
      "id" in req.body ||
      "username" in req.body ||
      "account_created" in req.body ||
      "account_updated" in req.body
    ) {
      return res.status(403).json({
        message:
          "User forbidden from updating id or username or account_created or account_updated fields",
        resolution: "Updatable fields are first_name, last_name, password",
      });
    } else {
      //call updateUser service
      if (
        "password" in req.body &&
        !checkForStrongPassword(req.body.password)
      ) {
        return res.status(400).json({
          message: "Password not strong enough",
          resolution:
            "Strong password should consist of at least 1 lowercase alphabet, 1 uppercase alphabet,1 numeric, 1 special character and eight characters or longer",
        });
      }

      await updateUser(req, (err, results) => {
        if (err) {
          return res.status(401).json({
            message: "Authentication failed",
            resolution: "Enter valid Authentication Header",
          });
        }
        return res.status(204).send();
      });
    }
  },
};
