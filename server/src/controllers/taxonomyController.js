const taxonomyService = require('../services/taxonomyService');

/**
 * GET /api/taxonomy
 * Returns full subject → topic → subtopic tree.
 */
const getAll = (req, res) => {
  res.json(taxonomyService.getAllSubjects());
};

/**
 * GET /api/taxonomy/:subject/topics
 * Returns topics for a subject.
 */
const getTopics = (req, res) => {
  const topics = taxonomyService.getTopicsForSubject(req.params.subject);
  res.json(topics);
};

/**
 * GET /api/taxonomy/:subject/topics/:topic/subtopics
 * Returns subtopics for a subject + topic.
 */
const getSubtopics = (req, res) => {
  const subtopics = taxonomyService.getSubtopicsForTopic(
    req.params.subject,
    req.params.topic
  );
  res.json(subtopics);
};

module.exports = { getAll, getTopics, getSubtopics };
