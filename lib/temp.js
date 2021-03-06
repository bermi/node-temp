var sys  = require('sys'),
    fs   = require('fs'),
    path = require('path');

/* HELPERS */

var defaultDirectory = '/tmp';
var environmentVariables = ['TMPDIR', 'TMP', 'TEMP'];

var findDirectory = function() {
  for(var i = 0; i < environmentVariables.length; i++) {
    var value = process.env[environmentVariables[i]];
    if(value)
      return fs.realpathSync(value);
  }
  return fs.realpathSync(defaultDirectory);
}

var generateName = function(rawAffixes, defaultPrefix) {
  var affixes = parseAffixes(rawAffixes, defaultPrefix);
  var now = new Date();
  var name = [affixes.prefix,
              now.getYear(), now.getMonth(), now.getDay(),
              '-',
              process.pid,
              '-',
              (Math.random() * 0x100000000 + 1).toString(36),
              affixes.suffix].join('');
  return path.join(exports.dir, name);
}

var parseAffixes = function(rawAffixes, defaultPrefix) {
  var affixes = {prefix: null, suffix: null};
  if(rawAffixes) {
    switch (typeof(rawAffixes)) {
    case 'string':
      affixes.prefix = rawAffixes;
      break;
    case 'object':
      affixes = rawAffixes;
      break
    default:
      throw("Unknown affix declaration: " + affixes);
    }
  } else {
    affixes.prefix = defaultPrefix;
  }
  return affixes;
}

/* DIRECTORIES */

var mkdir = function(affixes, callback) {
  var dirPath = generateName(affixes, 'd-');
  fs.mkdir(dirPath, 0700, function(err) { 
    if (!err) {
      _gc.push(['rmdirSync', dirPath]);
    }
    if (callback)
      callback(err, dirPath);
  });
}
var mkdirSync = function(affixes) {
  var dirPath = generateName(affixes, 'd-');
  fs.mkdirSync(dirPath, 0700);
  _gc.push(['rmdirSync', dirPath]);
  return dirPath;
}

/* FILES */

var open = function(affixes, callback) {
  var filePath = generateName(affixes, 'f-')
  fs.open(filePath, 'w+', 0600, function(err, fd) {
    if (!err)
      _gc.push(['unlinkSync', filePath]);
    if (callback)
      callback(err, {path: filePath, fd: fd});
  });
}
                    
var openSync = function(affixes) {
  var filePath = generateName(affixes, 'f-')
  var fd = fs.openSync(filePath, "w+", 0600);
  _gc.push(['unlinkSync', filePath]);
  return {path: filePath, fd: fd};
}

/* GARBAGE COLLECTION ON EXIT */

var _gc = [];
process.addListener('exit', function() {
  for(var i in _gc) {
    try {
      fs[_gc[i][0]](_gc[i][1]);
    } catch (rmErr) { /* removed manually */ }
  }
});

/* EXPORTS */

exports.dir = findDirectory();
exports.mkdir = mkdir;
exports.mkdirSync = mkdirSync;
exports.open = open;
exports.openSync = openSync;
exports.path = generateName;
