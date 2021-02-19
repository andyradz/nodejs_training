// --------------------------------------------------------------------------------------------
/*
    kdpw_stream ECA APM

    Baza danych

    Copyryght: 2019 KDPW

*/

//process.env.DB2CCSID = '1208';
const os = require('os');
if (os.platform() == 'win32') {
  exports.newStmt = function () {
    let stmt =
    {
      exec: (sql, f) => {
        f([], false);
      },
      close: () => {}
    };
    return stmt;
  };
} else {
  var db = require("/QOpenSys/QIBM/ProdData/OPS/Node6/os400/db2i/lib/db2a");
  var dbconn = new db.dbconn();
  dbconn.conn("*LOCAL");
  exports.newStmt = function () {
    return new db.dbstmt(dbconn);
  };
}
