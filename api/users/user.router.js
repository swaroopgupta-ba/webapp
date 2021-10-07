const basicAuth = require("../../helpers/basic-auth");
const { createUser, getUser, updateUser } = require("./user.controller");
const router = require("express").Router();

router.post("/", createUser);
router.get("/self", basicAuth, getUser).put("/self", basicAuth, updateUser);

module.exports = router;
