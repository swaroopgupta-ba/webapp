const { pool, rep_pool } = require("../../config/database");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { generateHashedPassword } = require("../../helpers/helper");
var AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

module.exports = {
  create: (data, callBack) => {
    // connection will be acquired automatically
    pool.query(
      `insert into user (id, first_name, last_name, password, username, account_created, account_updated)
      values (?,?,?,?,?,?,?)`,
      [
        data.id,
        data.first_name,
        data.last_name,
        data.password,
        data.username,
        data.account_created,
        data.account_updated,
      ],
      (error, results, fields) => {
        if (error) {
          return callBack(error);
        }

        var dynamoClient = new AWS.DynamoDB.DocumentClient();
        var table = "dynamo";
        var expires = new Date();
        expires.setTime(expires.getTime() + 60 * 5 * 1000);

        var tokenParams = {
          TableName: table,
          Item: {
            id: req.body.username,
            token: Math.random().toString(36).substr(2, 5),
            expiryDate: Math.floor((new Date().getTime() + 5 * 60000) / 1000),
          },
        };

        dynamoClient.put(tokenParams, function (err, data) {
          if (err) {
            logger.error(
              "Error in adding item in dynamoDB:",
              JSON.stringify(err, null, 2)
            );
            console.error(
              "Error in adding item in dynamoDB:",
              JSON.stringify(err, null, 2)
            );
          } else {
            logger.info(
              "Added item in dynamoDB:",
              JSON.stringify(data, null, 2)
            );
          }
        });

        var params = {
          Name: data.first_name,
          Message: data.username,
          TopicArn: SNS_TOPIC_ARN,
        };

        var publishSNSPromise = new AWS.SNS({ apiVersion: "2010-03-31" })
          .publish(params)
          .promise();

        publishSNSPromise
          .then(function (promiseResults) {
            console.log(
              `Message ${params.Message} sent to the topic ${params.TopicArn}`
            );
            console.log("MessageID is " + promiseResults.MessageId);
          })
          .catch(function (err) {
            console.error(err, err.stack);
          });

        return callBack(null, {
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          account_created: data.account_created,
          account_updated: data.account_updated,
          verified: data.verified,
          verified_on: data.verified_on,
        });
      }
    );
  },
  getUser: (username, password, callBack) => {
    rep_pool.query(
      `select * from user where username = ?`,
      [username],
      (error, results, fields) => {
        if (error) {
          return callBack(error);
        } else {
          if (results.length > 0) {
            return bcrypt.compare(
              password,
              results[0].password,
              function (err, isMatch) {
                if (isMatch && results[0].verified) {
                  let {
                    id,
                    first_name,
                    last_name,
                    username,
                    account_created,
                    account_updated,
                    verified,
                    verified_on,
                  } = results[0];

                  return callBack(null, {
                    id,
                    first_name,
                    last_name,
                    username,
                    account_created,
                    account_updated,
                    verified,
                    verified_on,
                  });
                } else {
                  return callBack(new Error("Authentication error"));
                }
              }
            );
          }
        }

        return callBack(null, results[0]);
      }
    );
  },
  updateUser: async (data, callBack) => {
    pool.query(
      `select * from user where username = ?`,
      [data.username],
      (error, results, fields) => {
        if (error) {
          return callBack(error);
        } else {
          if (results.length > 0) {
            return bcrypt.compare(
              data.password,
              results[0].password,
              function (err, isMatch) {
                if (isMatch && results[0].verified) {
                  let currentData = results[0];
                  currentData.password = data.body.password
                    ? generateHashedPassword(data.body.password)
                    : currentData.password;
                  currentData.first_name = data.body.first_name
                    ? data.body.first_name
                    : currentData.first_name;
                  currentData.last_name = data.body.last_name
                    ? data.body.last_name
                    : currentData.last_name;
                  pool.query(
                    `update user set first_name = '${currentData.first_name}',
                     last_name = '${currentData.last_name}',
                      password = '${currentData.password}' where username = ?`,
                    [currentData.username],
                    (error, results, fields) => {
                      if (error) {
                        return callBack(error);
                      }
                      return callBack(null, {
                        message: "Update Successful",
                      });
                    }
                  );
                } else {
                  return callBack(new Error("Authentication error"));
                }
              }
            );
          }
        }

        return callBack(null, results[0]);
      }
    );
  },
};
