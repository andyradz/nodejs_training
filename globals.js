// --------------------------------------------------------------------------------------------
/*
    kdpw_stream ECA APM

    Globalne ustawienia aplikacji

    Copyryght: 2020 KDPW

*/

var initDef = {};

initDef.envId = "DEV";
initDef.dtaId = "DEV";
initDef.myIp = process.env.ECA_MY_IP || "10.250.50.178";
initDef.httpsPort = 0;
initDef.httpPort = process.env.ECA_HTTP_PORT ||27100;
initDef.webSocketPort = 0;
initDef.ldapsIp = "intra.kdpw.com.pl";
initDef.ldapsPort = 636;
initDef.wrkCnt = 1;
initDef.clientBinFolder = "../client";
initDef.serverBinFolder = ".";
initDef.serverCerFolder = "../certs";
initDef.serverVarFolder = "..";
initDef.version = "0.1.0";

exports.def = initDef;
