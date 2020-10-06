// var oecloud = require('oe-cloud');
var chai = require('chai');
chai.use(require('chai-things'));
var loopback = require('loopback');
var expect = chai.expect;
var fs = require('fs');
var path = require('path');
var bootstrapped = require('./bootstrapper');
var { fetchXLSBase64 } = require('./test-utils');

describe('DecisionService Model Tests', () => {
  var DecisionGraph, DecisionService;
  // var prefix = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,";
  var testContext = {
    ctx: { tenantId: 'test-tenant'}
  };

  before('wait for boot', function (done) {
    // this.timeout(8000)
    bootstrapped.then(() => {
      // debugger
      // console.log('after boot');
      DecisionGraph = loopback.findModel('DecisionGraph');
      DecisionService = loopback.findModel('DecisionService');

      expect(DecisionGraph).to.not.be.undefined;
      expect(DecisionService).to.not.be.undefined;

      done();
    })
      .catch(done);
  });

  before('create a decision graph', function (done) {
    var filePath = path.resolve(path.join(__dirname, 'test-data/RoutingDecisionService-Demo.xlsx'));
    var data = {
      name: 'foo1',
      documentName: 'RoutingDecisionService-Demo.xlsx',
      documentData: fetchXLSBase64(filePath)
    };
    DecisionGraph.create(data, testContext, function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });


  it('should insert decision service data without errors', function (done) {
    var data = {
      name: 'service1',
      decisions: ['Routing'],
      graphId: 'foo1'
    };

    DecisionService.create(data, testContext, function (err) {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });

  it('should fail when you insert service data with a non-existant decision name', function (done) {
    var data = {
      name: 'service2',
      graphId: 'foo1',
      decisions: ['Routing', 'Affordability']
    };

    DecisionService.create(data, testContext, function (err) {
      expect(err, 'it did not fail!').to.not.be.null;
      done();
    });
  });

  it('should fail when you invoke a service with a wrong service name', function (done) {
    var payload = {
      'Applicant data': {
        Age: 51,
        MaritalStatus: 'M',
        EmploymentStatus: 'EMPLOYED',
        'ExistingCustomer': false,
        'Monthly': {
          'Income': 10000,
          'Repayments': 2500,
          'Expenses': 3000
        }
      },
      'Requested product': {
        ProductType: 'STANDARD LOAN',
        Rate: 0.08,
        Term: 36,
        Amount: 100000
      },
      'Bureau data': {
        Bankrupt: false,
        CreditScore: 600
      }
    };
    DecisionService.invoke('wrongService', payload, testContext, function(err) {
        expect(err).to.exist;
        expect(err.message).to.equal('No Service found for ServiceName wrongService')
        done();
    });
  });

  it('should invoke a service and give the correct result', function (done) {
    var payload = {
      'Applicant data': {
        Age: 51,
        MaritalStatus: 'M',
        EmploymentStatus: 'EMPLOYED',
        'ExistingCustomer': false,
        'Monthly': {
          'Income': 10000,
          'Repayments': 2500,
          'Expenses': 3000
        }
      },
      'Requested product': {
        ProductType: 'STANDARD LOAN',
        Rate: 0.08,
        Term: 36,
        Amount: 100000
      },
      'Bureau data': {
        Bankrupt: false,
        CreditScore: 600
      }
    };
    DecisionService.invoke('service1', payload, testContext, (err, result) => {
      if (err) {
        done(err);
      } else {
        expect(result).to.eql({
          Routing: {
            Routing: 'ACCEPT'
          }
        });
        done();
      }
    });
  });

  it('should update a service without errors', function (done) {
    DecisionService.findOne({ where: { name: 'service1' }}, testContext, function (err, data) {
      if (err) {
        done(err);
      } else {
        // console.dir(data);
        expect(data).to.not.be.null;
        expect(data.name).to.equal('service1');
        // expect(data.decisions).to.be.array;
        expect(Array.isArray(data.decisions)).to.be.true;
        // console.log(data.decisions);
        expect(data.decisions.slice()).to.eql(['Routing']);
        expect(data.id).to.be.string;
        var id = data.id;
        var version = data._version;
        var graphId = data.graphId;
        // debugger;
        DecisionService.upsert({
          id: id,
          // _version: version,
          decisions: ['Routing Rules'],
          graphId,
          name: 'service1'
        }, testContext, function (err, result) {
          if (err) {
            done(err);
          } else {
            expect(result).to.be.defined;
            expect(result.name).to.equal('service1');
            done();
          }
        });
        // done();
      }
    });
  });
});
