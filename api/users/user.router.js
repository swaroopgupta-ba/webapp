const basicAuth = require("../../helpers/basic-auth");
const {
  createUser,
  getUser,
  updateUser,
  uploadFile,
  getFile,
  deleteFile,
} = require("./user.controller");
const router = require("express").Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post("/", createUser);
router.get("/self", basicAuth, getUser).put("/self", basicAuth, updateUser);
router.post("/self/pic", basicAuth, uploadFile);
router.get("/self/pic", basicAuth, getFile);
router.delete("/self/pic", basicAuth, deleteFile);

module.exports = router;
