const express = require("express");
const router = express.Router();
const visitorController = require("../controllers/visitorController");

// Gate visitors routes
router.get("/", visitorController.getVisitors);
router.post("/check-in", visitorController.checkInVisitor);
router.put("/:id/check-out", visitorController.checkOutVisitor);

// Pre-approved pass routes
router.get("/preapproved", visitorController.getPreapprovedPasses);
router.post("/preapproved", visitorController.createPreapprovedPass);
router.post("/preapproved/verify-otp", visitorController.verifyOtpAndAllow);
router.put("/preapproved/:id/revoke", visitorController.revokePass);

module.exports = router;
