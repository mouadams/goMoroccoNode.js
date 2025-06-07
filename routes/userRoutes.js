const express = require('express');
const { authUser, registerUser } = require('../controllers/userController');
// import  verifyToken   from "../middlewares/verifyToken.js";
// import { refreshToken } from "../controllers/refreshToken.js";



const router = express.Router();


router.route("/login").post(authUser);
router.route("/register").post(registerUser);


module.exports = router;