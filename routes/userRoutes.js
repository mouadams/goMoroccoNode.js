const express = require("express");
const {
  authUser,
  registerUser,
  getAllUsers,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
// import  verifyToken   from "../middlewares/verifyToken.js";
// import { refreshToken } from "../controllers/refreshToken.js";

const router = express.Router();

router.route("/login").post(authUser);
router.route("/register").post(registerUser);
router.route("/users").get(getAllUsers);
router.route("/users/:id").put(updateUser);
router.route("/users/:id").delete(deleteUser);

module.exports = router;
