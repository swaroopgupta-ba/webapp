const pool = require("../../config/database");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { generateHashedPassword } = require("../../helpers/helper");

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
        return callBack(null, {
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          account_created: data.account_created,
          account_updated: data.account_updated,
        });
      }
    );
  },
  getUser: (username, password, callBack) => {
    pool.query(
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
                if (isMatch) {
                  let {
                    id,
                    first_name,
                    last_name,
                    username,
                    account_created,
                    account_updated,
                  } = results[0];

                  return callBack(null, {
                    id,
                    first_name,
                    last_name,
                    username,
                    account_created,
                    account_updated,
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
                if (isMatch) {
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
