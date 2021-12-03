const { create, getUser, updateUser } = require("./user.service");
const { genSaltSync, hashSync, compareSync } = require("bcrypt");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { pool, rep_pool } = require("../../config/database");

const {
  validateEmail,
  checkForStrongPassword,
  generateHashedPassword,
} = require("../../helpers/helper");

const { s3_bucket } = require("../../config.json");

var auth = require("basic-auth");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs");

var AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const log = require("../../logs");
const logger = log.getLogger("logs");
var SDC = require("statsd-client"),
  sdc = new SDC({ port: 8125 });

module.exports = {
  //createUser controller
  createUser: (req, res) => {
    const newUser = req.body;
    logger.info("create user api called");
    sdc.increment("User.createUser");
    let timer = new Date();
    let db_timer = new Date();

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
      logger.info("created new user successfully");
      sdc.timing("User.createUser", db_timer);
      return res.status(201).send(results);
    });
  },
  getUser: async (req, res) => {
    const username = req.username;
    const password = req.password;
    logger.info("get user api called");
    sdc.increment("User.getUser");
    let timer = new Date();
    let db_timer = new Date();
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
      logger.info("user details fetched successfully");
      sdc.timing("User.getUser", db_timer);
      return res.send(results);
    });
  },
  updateUser: async (req, res) => {
    logger.info("update user api called");
    sdc.timing("User.updateUser", db_timer);
    if (
      "id" in req.body ||
      "username" in req.body ||
      "account_created" in req.body ||
      "account_updated" in req.body ||
      "verified" in req.body ||
      "verified_on" in req.body
    ) {
      return res.status(403).json({
        message:
          "User forbidden from updating id or username or account_created or account_updated or verified or verified_on fields",
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
        logger.info("updated user details successfully");
        sdc.timing("User.updateUser", db_timer);
        return res.status(204).send();
      });
    }
  },
  uploadFile: async (req, res) => {
    logger.info("upload file api called");
    buf = Buffer.from(
      req.body.contents.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    var username = req.username;
    var password = req.password;
    let id = crypto.randomBytes(16).toString("hex");
    let today = new Date();
    let s3_file_name = req.username + "-" + req.body.filename;
    pool.query(
      "SELECT u.id, u.password, u.verified, i.file_name FROM user u left join image i on u.id = i.user_id WHERE username = ?",
      [username],
      async function (error, results, fields) {
        if (error) {
          res.status(400).send({
            failed: "error occurred",
            error: error,
          });
        } else {
          if (results.length > 0) {
            const comparison = await bcrypt.compare(
              password,
              results[0].password
            );
            if (comparison & results[0].verified) {
              var upload_data = {
                Bucket: s3_bucket,
                Key: s3_file_name,
                Body: buf,
                ContentEncoding: "base64",
                ContentType: "image/png",
              };
              if (results[0].file_name != null) {
                var params = { Bucket: s3_bucket, Key: results[0].file_name };
                s3.deleteObject(params, function (err, data) {
                  if (err) {
                    console.log("Error in your logic");
                  } else {
                    console.log("Profile pic deleted");
                    s3.upload(upload_data, function (err, data) {
                      if (err) {
                        console.log(err);
                        console.log("Error uploading data: ", upload_data);
                      } else {
                        console.log("Successfully uploaded the image!");
                        pool.query(
                          "UPDATE image set file_name = ?,url = ?, upload_date = ? where user_id = ?",
                          [data.key, data.Location, new Date(), results[0].id],
                          async function (error, results1, fields) {
                            if (error) {
                              console.log("err :", error);
                              res.status(400).send({
                                failed: "New Image upload unsuccessful",
                              });
                            } else {
                              res.status(201).send({
                                success: "Image Updated Successfully",
                                file_name: data.Key,
                                id: id,
                                url: data.Location,
                                upload_date: today,
                                user_id: results[0].id,
                              });
                            }
                          }
                        );
                      }
                    });
                  }
                });
              } else {
                s3.upload(upload_data, function (err, data) {
                  if (err) {
                    console.log(err);
                    console.log("Error uploading data: ", upload_data);
                  } else {
                    pool.query(
                      "INSERT INTO image(file_name,id,url,upload_date,user_id) VALUES(?,?,?,?,?)",
                      [data.key, id, data.Location, today, results[0].id],
                      async function (error, results1, fields) {
                        if (error) {
                          console.log("err :", error);
                          res.status(400).send({
                            failed: "New Image upload unsuccessful",
                          });
                        } else {
                          logger.info("added user profile pic successfully");
                          res.status(201).send({
                            success: "Image Uploaded Successfully",
                            file_name: data.Key,
                            id: id,
                            url: data.Location,
                            upload_date: today,
                            user_id: results[0].id,
                          });
                        }
                      }
                    );
                  }
                });
              }
            } else {
              res.status(403).send({
                error: "Email and password does not match",
              });
            }
          } else {
            res.status(404).send({
              error: "Email does not exist",
            });
          }
        }
      }
    );
  },
  getFile: async (req, res) => {
    var username = req.username;
    var password = req.password;
    rep_pool.query(
      "SELECT * FROM user u left join image i on u.id = i.user_id WHERE username = ?",
      [username],
      async function (error, results, fields) {
        if (error) {
          res.status(400).send({
            failed: "error occurred",
            error: error,
          });
        } else {
          if (results.length > 0) {
            const comparison = await bcrypt.compare(
              password,
              results[0].password
            );
            if (comparison & results[0].verified) {
              var params = { Bucket: s3_bucket, Key: results[0].file_name };
              s3.getObject(params, function (err, data) {
                if (err) {
                  res.status(404).send({
                    error: "Image Not Found",
                  });
                }
                res.status(201).send({
                  success: "Image Retrieved Successfully",
                  file_name: results[0].Key,
                  id: results[0].user_id,
                  url: results[0].Location,
                  upload_date: results[0].upload_date,
                  user_id: results[0].id,
                });
              });
            } else {
              res.status(403).send({
                error: "Email and password does not match",
              });
            }
          } else {
            res.status(404).send({
              error: "Email does not exist",
            });
          }
        }
      }
    );
  },
  deleteFile: async (req, res) => {
    var username = req.username;
    var password = req.password;

    pool.query(
      "SELECT * FROM user u inner join image i on u.id = i.user_id WHERE username = ?",
      [username],
      async function (error, results, fields) {
        if (error) {
          res.status(400).send({
            failed: "error occurred",
            error: error,
          });
        } else {
          if (results.length > 0) {
            const comparison = await bcrypt.compare(
              password,
              results[0].password
            );
            if (comparison & results[0].verified) {
              var params = { Bucket: s3_bucket, Key: results[0].file_name };
              s3.deleteObject(params, function (err, data) {
                if (err) {
                  res.status(404).send({
                    error: "Image Not Found",
                  });
                } else {
                  pool.query(
                    "DELETE from image where user_id = ?",
                    [results[0].id],
                    async function (error, results1, fields) {
                      if (error) {
                        console.log("err :", error);
                        res.status(400).send({
                          failed:
                            "Image deleted from s3, error in deleting database record",
                        });
                      } else {
                        res.status(204).send();
                      }
                    }
                  );
                }
              });
            } else {
              res.status(403).send({
                error: "Email and password does not match",
              });
            }
          } else {
            res.status(404).send({
              error: "Email or Profile pic does not exist",
            });
          }
        }
      }
    );
  },
  verifyUser: (req, res) => {
    var query = require("url").parse(req.url, true).query;
    var email = query.email;
    var token = query.token;

    logger.info("email", email);
    logger.info("Token ", token);

    var DynamoDB_client = new AWS.DynamoDB({ apiVersion: "2012-08-10" });

    if (email == undefined || token == undefined) {
      logger.info("Invalid Email or token");
      return;
    }

    let queryParams = {
      TableName: "dynamo",
      Key: {
        id: { S: email },
      },
    };

    DynamoDB_client.getItem(queryParams, (err, data) => {
      if (err) {
        logger.info("err", err);
      } else {
        var retrieved_token = Object.values(data.Item.token)[0];
        if (token === retrieved_token) {
          if (Math.floor(Date.now() / 1000) > data.Item.expiryDate.N) {
            logger.info("Token expired :(");
            return res.status(400).send("Token Expired :(");
          }
          logger.info("Email Verification Success");

          pool.query(
            `update user set verified = true, verified_on = ? where username = ?`,
            [new Date(), email],
            (error, results, fields) => {
              if (error) {
                res.status(403).send({
                  message: "Verification failed",
                });
              }
              return res.status(200).send("User Successfully Verified");
            }
          );
        } else {
          return res.status(400).send("Token invalid");
        }
      }
    });
  },
};
