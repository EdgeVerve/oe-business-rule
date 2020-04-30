/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/* jshint -W024 */
/* jshint expr:true */
// to avoid jshint errors for expect

var bootstrapped = require('./bootstrapper');
var chalk = require('chalk');
var chai = require('chai');
var expect = chai.expect;
var loopback = require('loopback');
chai.use(require('chai-things'));
var { fetchXLSBase64 } = require('./test-utils');
var path = require('path');
var clone = require('deepcopy');

describe(chalk.blue('Blank payload tests'), function () {
  var DecisionTable, Customer;
  var testContext = { ctx: { tenantId: 'test-tenant' }};
  before('wait for boot', function (done) {
    bootstrapped.then(() => {
      DecisionTable = loopback.findModel('DecisionTable');
      Customer = loopback.findModel('Customer');

      expect(DecisionTable).to.not.be.undefined;
      expect(Customer).to.not.be.undefined;
      done();
    });
  });

  before('inserting some initial data', function (done) {
    var data = [
      {
        name: 'foo',
        amount: {
          value: 250,
          currency: 'INR'
        }
      },
      {
        name: 'foo1',
        amount: {
          value: 250,
          currency: 'US'
        }
      },
      {
        name: 'foo3',
        amount: {}
      }
    ];

    Customer.create(data, testContext, done);
  });

  // the below before block throws errors for oracledb as database - hence commenting

  // before('get convinced that model data insertion does not throw an error for insertion of record with amount as blank string', function (done) {
  //   var data = {
  //     name: 'foo4',
  //     amount: ""
  //   };

  //   Customer.create(data, testContext, function (err) {
  //     // console.dir(err);
  //     expect(err).to.be.null;
  //     done();
  //   });
  // });

  before('create a decision table', function (done) {
    var docData = fetchXLSBase64(path.resolve(path.join(__dirname, 'test-data/blank_object.xlsx')));
    var docData2 = fetchXLSBase64(path.resolve(path.join(__dirname, 'test-data/blank_object2.xlsx')));
    var docData3 = fetchXLSBase64(path.resolve(path.join(__dirname, 'test-data/blank_object3.xlsx')));

    var data = [
      {
        name: 'TestDecision2',
        document: {
          documentName: 'blank_object.xlsx',
          documentData: docData
        }
      },
      {
        name: 'TestDecision3',
        document: {
          documentName: 'blank_object2.xlsx',
          documentData: docData2
        }
      },
      {
        name: 'TestDecision4',
        document: {
          documentName: 'blank_object3.xlsx',
          documentData: docData3
        }
      }
    ];

    var promises = data.map(d => new Promise((resolve, reject) => {
      var context = clone(testContext);
      var { name, document: {documentName, documentData }} = d;
      var toInsert = {name, documentName, documentData };
      DecisionTable.create(toInsert, context, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }));

    Promise.all(promises).then(() => done()).catch(done);
  });

  it('should execute the decision table rule correctly - test 1', function (done) {
    Customer.findOne({ where: { name: 'foo' } }, testContext, function (err, result) {
      expect(result.name).to.equal('foo');
      expect(result.amount.value).to.equal(250);
      expect(result.amount.currency).to.equal('INR');
      // console.dir(result);
      // result.options = testContext;
      // result.options.modelName = Customer.modelName;
      // debugger;
      var payload = result.__data;
      payload.options = testContext;
      payload.options.modelName = Customer.modelName;

      DecisionTable.exec('TestDecision2', payload, testContext, function (err, dtResult) {
        if (err) {
          // console.log('error')
          // console.dir(err);
          done(err);
        } else {
          // console.log('pass')
          // console.dir(dtResult);
          expect(dtResult).to.be.array;
          expect(dtResult[0].errMessage).to.be.true;
          done();
        }
        // expect(dtResult)
      });
    });
  });


  it('should fail to execute the decision table rule correctly - test 2 - because we are trying to fetch non-existent property on an object', function (done) {
    Customer.findOne({ where: { name: 'foo3' } }, testContext, function (err, result) {
      expect(result.name).to.equal('foo3');
      var payload = result.__data;
      payload.options = testContext;
      payload.options.modelName = Customer.modelName;

      DecisionTable.exec('TestDecision3', payload, testContext, function (err) {
        if (err) {
          done();
        } else {
          done(new Error('Should not pass'));
        }
      });
    });
  });

  // note: add the necessary external function config.
  // In this test, we have added this in test\bootstrap.js

  it('should execute the decision table correctly', function (done) {
    this.timeout(3000);
    var executor = function (payload) {
      return new Promise((resolve, reject) => {
        DecisionTable.exec('TestDecision4', payload, testContext, function (err, dtResult) {
          if (err) {
            // console.log('ValidationResult:', err);
            reject(err);
          } else {
            // console.log('reject')
            // console.log(arguments);
            resolve(dtResult);
          }
        });
      });
    };
    // debugger;
    Customer.find({}, testContext, function (err, results) {
      // console.log(inspect(results))
      // expect(results.map).to.be.function;
      if (err) {
        done(err);
      } else {
        // expect(results.length).to.equal(4);
        // console.log('records:', inspect(results));
        var promises = results.map(r => {
          var pl = r.__data;
          pl.options = testContext;
          pl.options.modelName = Customer.modelName;
          return executor(pl);
        });


        Promise.all(promises).then(function (responses) {
          // console.log('responses:', inspect(responses));
          // console.log('responses:', responses);
          responses.forEach(resp => {
            // expect(resp[0].errorCode).to.not.equal('JS_FEEL_ERR');
            if (resp.length) {
              expect(resp[0].errCode).to.not.equal('JS_FEEL_ERR');
            }
          });
          done();
        }).catch(e => {
          // console.dir(e);
          done(e);
        });
      }
    });
  });

  // after(function(){
  //   //model-feel-decision-table-blank-object-payload-test.js
  //   debugger;
  // });
});
