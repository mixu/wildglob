module.exports = process.platform === 'win32' ? absWin : absUnix;

function absWin (p) {
  if (absUnix(p)) { return true; }
  // pull off the device/UNC bit from a windows path.
  // from node's lib/path.js
  var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/,
      result = splitDeviceRe.exec(p),
      device = result[1] || '',
      isUnc = device && device.charAt(1) !== ':',
      isAbsolute = !!result[2] || isUnc; // UNC paths are always absolute

  return isAbsolute;
}

function absUnix (p) {
  return (p.charAt(0) === '/' || p === '');
}
