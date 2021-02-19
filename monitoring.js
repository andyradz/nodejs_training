var express = require("express");
const httpStatus = require('http-status-codes');
const log = require("../lib/log");
const router = express.Router();

const registerRoutes = router => {
  router.get("/status", (req, res) => {
    res.status(httpStatus.OK)
       .write("OK");
    res.end();
  });
};

registerRoutes(router);

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
