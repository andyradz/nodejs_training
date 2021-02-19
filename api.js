var express = require("express");

const log = require("../lib/log");
const router = express.Router();

const registerWzVoteList = require("./wz-vote-list");
const registerWzProxyList = require("./wz-proxy-list");
const registerWzParticipantList = require("./wz-participant-list");
const registerWzMembersList = require("./wz-members-list");
const registerSearchIds = require("./wz-search")
const registerVoteRegistrationCnf = require('./wz-vote-reg-confirm')

registerWzVoteList(router);
registerWzProxyList(router);
registerWzParticipantList(router);
registerWzMembersList(router);
registerSearchIds(router);
registerVoteRegistrationCnf(router);

/**
 *  404
 *  Nie znaleziono strony
 *
 */
router.use((req, res, next) => {
  log.log("404 (ECA APM) Not Found: " + req.method + ":" + req.url);
  res.status(404).write("{}");
  res.contentType.JSON;
  res.end();
});

/**
 *  500
 *  Błąd wewnętrzny aplikacji
 *
 */
router.use((err, req, res, next) => {
  log.error("500 Internal Error: " + req.method + ":" + req.url);
  log.error(err.message);
  res.status(500).write("");
  res.contentType.JSON;
  res.end();
});

module.exports = router;
