/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */
/* jshint -W024 */
/* jshint expr:true */
//to avoid jshint errors for expect

// var oecloud = require('oe-cloud');
// var loopback = require('loopback');
var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));
var loopback = require('loopback');
var expect = chai.expect;
var fs = require('fs');
var path = require('path');
var bootstrapped = require('./bootstrapper');

// var prefix = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,';
var { fetchXLSBase64 } = require('./test-utils');

var fs = require('fs');


describe(chalk.blue('Business rule - belongsTo relation'), function () {
  var DecisionTable, Customer, Order;
  var testContext = { ctx: { tenantId: 'test-tenant ' } };
  var custId;

  before('wait for boot', function (done) {
    bootstrapped.then(() => {

      DecisionTable = loopback.findModel('DecisionTable');
      Customer = loopback.findModel('Customer');
      Order = loopback.findModel('Order');

      expect(DecisionTable).to.not.be.undefined;
      expect(Customer).to.not.be.undefined;
      expect(Order).to.not.be.undefined;

      done();
    })
    .catch(done);
  });

  before('creating dummy data for Customer', function (done) {
    var data = {
      name: 'Ankur',
      amount: {
        value: 100,
        unit: 'INR'
      }
    };

    Customer.create(data, testContext, function (err, result) {
      if (err) {
        done(err)
      }
      else {
        expect(err).to.be.null;
        expect(result.name).to.equal(data.name);
        custId = result.id;
        done();
      }
    });
  });

  before('creating some dummy data in Order', function (done) {
    var data = {
      gate: 'foo',
      custId: 'Ankur'
    };

    Order.create(data, testContext, function (err, result) {
      if (err) {
        done(err)
      }
      else {
        // console.dir(err);
        expect(err).to.be.null;
        expect(result.date).to.equal(data.date);
        // console.dir(result);
        // orderId = result.id;
        done();
      }
    });
  });

  before('creating a decision table', function (done) {
    var data = {
      name: 'TestDecision',
      documentName: 'fetch_relations.xlsx',
      documentData: fetchXLSBase64(path.resolve(path.join(__dirname, 'test-data/fetch_relations.xlsx')))
    };

    DecisionTable.create(data, testContext, function (err, result) {
      if (err) {
        done(err);
      }
      else {
        expect(result).to.not.be.null;
        expect(result.name).to.equal(data.name);
        done();
      }
    });
  });

  it('should access the belongsTo relation and process rule correctly', function (done) {
    Order.findOne({ gate: 'foo' }, testContext, function (err, orderRecord) {
      if (err) {
        done(err)
      }
      else {
        // console.log('foo');
        expect(orderRecord).to.not.be.null;
        expect(orderRecord.gate).to.equal('foo');
        expect(orderRecord.cust).to.not.be.null;
        orderRecord.cust(testContext, function (err, relatedRecord) {
          // console.dir(relatedRecord);
          expect(relatedRecord).to.not.be.null;
          expect(relatedRecord.name).to.equal('Ankur');
          // done();
          // console.dir(bootstrap.defaultContext);
          // orderRecord.options = bootstrap.defaultContext;
          // orderRecord.options.modelName = Order.modelName;
          var payload = orderRecord.__data;
          payload.options = testContext;
          payload.options.modelName = Order.modelName;

          DecisionTable.exec('TestDecision', payload, testContext, function (err, dtResult) {
            if (err) {
              done(err)
            }
            else {
              // console.dir(dtResult);
              expect(dtResult["customer name"]).to.equal(100);
              done();
            }
          });
        });
        // done();
      }
    });
  });
});
