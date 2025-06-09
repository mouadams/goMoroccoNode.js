const express = require('express');
const router = express.Router();
const activityController = require('../controllers/ActivityController');

router.get('/', activityController.getAllActivities);
router.get('/:id', activityController.getActivity);
router.post('/', activityController.createActivity);
router.put('/:id', activityController.updateActivity);
router.delete('/:id', activityController.deleteActivity);

module.exports = router;