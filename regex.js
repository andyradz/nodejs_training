const kdpwMmmbIdRegEx = new RegExp("^([A-Z0-9]{4,4})$");
const caRefRegEx = new RegExp("^([A-Z0-9]{16,16})$");
const dateRegEx = new RegExp("^([0-9]{4})-(1[0-2]|0[1-9])-(3[0-1]|0[1-9]|[1-2][0-9])$");
const idKdpw = new RegExp("^([0-9]{3,10})$")

module.exports.kdpwMmmbIdRegEx = kdpwMmmbIdRegEx;
module.exports.caRefRegEx = caRefRegEx;
module.exports.dateRegEx = dateRegEx;
module.exports.idKdpw = idKdpw;