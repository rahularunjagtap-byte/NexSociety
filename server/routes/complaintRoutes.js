const express = require("express");
const router = express.Router();
const complaintController = require("../controllers/complaintController");

router.get("/", complaintController.getComplaints);
router.post("/", complaintController.createComplaint);
router.put("/:id/resolve", complaintController.resolveComplaint);
router.delete("/:id", complaintController.deleteComplaint);

module.exports = router;
