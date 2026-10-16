const express = require("express");
const router = express.Router();
const duesController = require("../controllers/duesController");

router.get("/directory", duesController.getFlatsDirectory);
router.get("/summary", duesController.getFinancialSummary);
router.get("/:flat_number", duesController.getFlatDues);
router.post("/pay", duesController.payDues);
router.post("/add-flat", duesController.addFlatResident);

module.exports = router;
