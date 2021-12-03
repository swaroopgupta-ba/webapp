const basicAuth = require("../../helpers/basic-auth");
const {
  createUser,
  getUser,
  updateUser,
  uploadFile,
  getFile,
  deleteFile,
  verifyUser,
} = require("./user.controller");
const router = require("express").Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post("/user", createUser);
router
  .get("/user/self", basicAuth, getUser)
  .put("/self", basicAuth, updateUser);
router.post("/user/self/pic", basicAuth, uploadFile);
router.get("/user/self/pic", basicAuth, getFile);
router.delete("/user/self/pic", basicAuth, deleteFile);
router.get("/verifyUserEmail", verifyUser);

module.exports = router;
