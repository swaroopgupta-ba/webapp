const { genSaltSync, hashSync, compareSync } = require("bcrypt");
const salt = genSaltSync(10);

const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
const strongPasswordPattern = new RegExp(
  "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})"
);

module.exports = {
  validateEmail: (email) => {
    return emailPattern.test(email);
  },
  checkForStrongPassword: (password) => {
    return strongPasswordPattern.test(password);
  },

  generateHashedPassword: (password) => {
    return hashSync(password, salt);
  },
};
