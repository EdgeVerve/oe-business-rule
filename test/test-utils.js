var fs = require('fs');
var path = require('path');
var prefix = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';

module.exports = {
  fetchXLSBase64: file => prefix + fs.readFileSync(file).toString('base64')
}