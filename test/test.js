var oecloud = require('oe-cloud');
var loopback = require('loopback');
var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));
var expect = chai.expect;

var bootstrapped = require('./bootstrapper');

describe("basic tests", () => {
  before('wait for boot', function(done){
    bootstrapped.then(() => done());
  });

  
});