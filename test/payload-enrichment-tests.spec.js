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
var { fetchXLSBase64 } = require('./test-utils');
var bootstrapped = require('./bootstrapper');

var testModelName = 'ModelRuleTest';
var testModelPlural = 'ModelRuleTests';
// Model with base as PersistedModel
var testModelAsBasePM = 'ModelWithBasePM';

var testModel;
var testModelWithBase;
var modelRuleId, modelRuleVersion;

describe('Payload Enrichment Tests', () => {
  var DecisionGraph;
  var DecisionTable;
  var DecisionService;
  var EnrichmentRule;
  var ModelDefinition;
  var decisionTableRules = ['PropertyPopulator', 'PropertyPopulatorOne'];
  var testContext = {
    ctx: { tenantId: 'test-tenant' }
  };

  before('wait for boot', function (done) {
    // this.timeout(8000)
    bootstrapped.then(() => {
      // debugger
      // console.log('after boot');
      DecisionGraph = loopback.findModel('DecisionGraph');
      DecisionTable = loopback.findModel('DecisionTable');
      DecisionService = loopback.findModel('DecisionService');
      EnrichmentRule = loopback.findModel('EnrichmentRule');
      ModelDefinition = loopback.findModel('ModelDefinition');

      expect(DecisionGraph).to.not.be.undefined;
      expect(DecisionTable).to.not.be.undefined;
      expect(DecisionService).to.not.be.undefined;
      expect(EnrichmentRule).to.not.be.undefined;
      expect(ModelDefinition).to.not.be.undefined;

      done();
    })
      .catch(done);
  });
  before('create the temporary model.', function (done) {
    // Forming model metadata
    var data = [{
      name: testModelName,
      base: 'BaseEntity',
      plural: testModelPlural,
      properties: {
        status: {
          type: 'string',
          max: 8
        },
        age: {
          type: 'number',
          max: 50
        },
        married: 'boolean',
        sex: 'string',
        husband_name: 'string',
        phone: 'number',
        email: 'string'
      }
    }, {
      name: testModelAsBasePM,
      base: 'PersistedModel',
      properties: {
        name: 'string'
      }
    }];
    // Creating Model in Loopback.
    ModelDefinition.create(data, testContext, function (err, models) {
      testModel = loopback.getModel(testModelName, testContext);
      testModelWithBase = loopback.getModel(testModelAsBasePM, testContext);
      done(err);
    });
  });

  before('create decision tables.', function (done) {
    // Population Decision Table rules.
    var decisionTablesData = [];
    async.each(decisionTableRules, function (rule, callback) {
      var obj = {
        name: rule,
        documentName: rule + '.xlsx',
        documentData: 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,'
      };
      fs.readFile(path.join(__dirname, 'test-data', obj.documentName), function (err, data) {
        if (err) {
          // log.error(log.defaultContext(), 'before->create decision tables for rule ', rule, ' error: ', err);
          callback(err);
        } else {
          obj.documentData = obj.documentData + data.toString('base64');
          decisionTablesData.push(obj);
          callback();
        }
      });
    }, function (ruleErr) {
      if (ruleErr) {
        log.error(log.defaultContext(), 'async.each->decisionTableRules final callback. Error: ', ruleErr);
        done(err);
      } else {
        // TODO : POST the array once defect of POST with array is fixed.
        // Creating Desicion Table rules.
        async.each(decisionTablesData, function (decisionTable, callback) {
          DecisionTable.create(decisionTable, testContext, function (err, res) {
            if (err) {
              log.error(log.defaultContext(), 'async.each->decisionTablesData->models.DecisionTable.create ',
                'decisionTable ', decisionTable.name, ' Error: ', err);
            }
            callback(err);
          });
        }, function (decisionTableErr) {
          if (decisionTableErr) log.error(log.defaultContext(), 'async.each->decisionTablesData->final callback Error: ', decisionTableErr);
          done(decisionTableErr);
        });
      }
    });
  });

  before('create model rules.', function (done) {
    var objs = [{
      modelName: testModelName,
      rules: [decisionTableRules[0], decisionTableRules[1]]
    }];
    // debugger;
    EnrichmentRule.create(objs, testContext, function (err, modelRules) {
      modelRuleId = modelRules[0].id;
      modelRuleVersion = modelRules[0]._version;
      expect(modelRules[0].modelName).to.equal(objs[0].modelName);
      done(err);
    });
  });
  it('should fail when creating an enrichment rule for a non-existent model', function (done) {
    EnrichmentRule.create({ modelName: 'NonExistentModel' }, testContext, function (err, res) {
      expect(err).not.to.be.null;
      expect(err).not.to.be.undefined;
      done();
    });
  });

  it('should successfully insert a model and enrich payload as expected', done => {
    var toInsert = {
      status: 'entered',
      age: 50,
      husband_name: 'Robin'
    };

    testModel.create(toInsert, testContext, function (err, res) {
      if (err) {
        // console.error("model-rule-test Error ", err);
        done(err);
      } else {
        expect(res).not.to.be.null;
        expect(res).not.to.be.undefined;
        expect(res.sex).to.be.equal('F');
        expect(res.married).to.be.equal(true);
        expect(res.phone).to.be.equal(1234);
        expect(res.email).to.be.equal('abc');
        done();
      }
    });
  });

  it('should successfully update a property based on a business rule', done => {
    var toInsert = {
      status: 'entered',
      age: 50,
      husband_name: 'Robin',
      email: 'jango@gmail.com'
    };

    testModel.create(toInsert, testContext, function (err, res) {
      if (err) {
        // console.error("model-rule-test Error ", err);
        done(err);
      } else {
        expect(res).not.to.be.null;
        expect(res).not.to.be.undefined;
        expect(res.sex).to.be.equal('F');
        expect(res.married).to.be.equal(true);
        expect(res.phone).to.be.equal(1234);
        expect(res.email).to.be.equal('abc');
        done();
      }
    });
  });
});
