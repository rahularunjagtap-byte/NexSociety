const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/login", authController.login);
router.post("/register", authController.register);
router.get("/profile", verifyToken, authController.getProfile);

module.exports = router;
