const log = require("../lib/log");

export function returnBadRequest(req, res, msg) {
    log.error(req.path + ' ' + (msg ? msg : ''));
    res.status(httpStatus.BAD_REQUEST);
    if (msg) {
      res.write(msg);
    }
    res.end();
  }