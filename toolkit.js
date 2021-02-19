const os = require('os');
if (os.platform() == 'win32') {
  class fakeIconn {
    constructor() {
      // console.log('fakeIconn constructor');
    }
    add(o) {
      // console.log('fakeIconn add');
    }
    run(clbk) {
      // console.log('fakeIconn run');
      clbk("rs");
    }
  }
  class fakeIpgm {
    constructor() {
      // console.log('fakeIpgm constructor');
    }
    addParam() {
      // console.log('fakeIpgm addParam');
    }
  }
  const fakeIcmd = (txt) => {
    // console.log(`fakeIcmd ${txt}`);
    return txt;
  }
  var fakeXt = {
    iConn: fakeIconn,
    iCmd: fakeIcmd,
    iPgm: fakeIpgm,
    xmlToJson: (rs) => [{ success: true }, { success: true }, { success: true }]
  }

  exports.toolkit = fakeXt;
} else {

  var xt = require('/QOpenSys/QIBM/ProdData/OPS/Node6/os400/xstoolkit/lib/itoolkit');
  exports.toolkit = xt;
}
