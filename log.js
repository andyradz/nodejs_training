// --------------------------------------------------------------------------------------------
/*
    kdpw_stream ECA APM

    Log

    Copyryght: 2020 KDPW

*/

/**
 * Wypisanie treści logu na konsolę
 *
 * @param {string} entry tekst logu.
 */
exports.log = function(entry) {
  console.log(`PID:${process.pid} ` + new Date().toISOString() + ": " + entry);
};

exports.error = function(entry) {
  console.error(
    `PID:${process.pid} ` + new Date().toISOString() + ": " + entry
  );
};

exports.stack = function(err) {
  console.error(err.stack);
};
