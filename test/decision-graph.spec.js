// var oecloud = require('oe-cloud');
// var loopback = require('loopback');
var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));
var loopback = require('loopback');
var expect = chai.expect;
// var fs = require('fs');
var path = require('path');
var { fetchXLSBase64 } = require('./test-utils');
var bootstrapped = require('./bootstrapper');

describe("Decision Graph Model Tests", () => {
  var DecisionGraph;
  var prefix = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,";
  var testContext = {
    ctx: { tenantId: 'test-tenant'}
  };

  before('wait for boot', function(done){
    // this.timeout(8000)
    bootstrapped.then(() => {
      // debugger
      // console.log('after boot');
      DecisionGraph = loopback.findModel('DecisionGraph');
      
      expect(DecisionGraph).to.not.be.undefined;
      expect(DecisionGraph).to.not.be.null;

      done();
    })
    .catch(done)
  });

  it('should parse and insert workbook data correctly', function(done) {
    var filePath = path.join(__dirname, 'test-data/RoutingDecisionService-Demo.xlsx');
    var inputData = {
      name: 'foo',
      "documentName" : "RoutingDecisionService-Demo.xlsx",
      "documentData" : fetchXLSBase64(filePath)
    };

    DecisionGraph.create(inputData, testContext, function(err, decisionGraph){
      if (err) {
        done(err)
      }
      else {
        expect(decisionGraph).to.be.defined;
        // expect(decisionGraph).to.be.array;
        expect(decisionGraph.data).to.be.object;
        var keys = [
            'Routing',
            'Routing Rules',
            'Post bureau risk category',
            'Post Bureau risk category table',
            'Post bureau affordability',
            'Affordability calculation',
            'Credit contingency factor',
            'Credit Contingency factor table',
            'Required monthly installment',
            'Installment Calculation',
            'Application risk score',
            'Application risk score model'
        ];

        expect('data' in decisionGraph).to.be.true;
        expect(decisionGraph.data).to.be.defined;
        // console.log(decisionGraph.__data);
        Object.keys(decisionGraph.data).map(key => {
            expect(keys.indexOf(key), 'Missing key: ' + key).to.not.equal(-1);
        });
        done();
      }
    });
  });

  it('should assert that the validate remoteMethod works as expected (for designer)', done => {
    // var incorrectData = {"Decision Table 1":"decision table(input expression list : ['inp1'],outputs : \"Output0\",input values list : [[\"a\"]],output values : [[\"A\"]],rule list : [['\"b\"','\"B\"']],id : 'Decision Table 1',hit policy : 'U')"};
    // var validData = {"name":"TestTable","decisionRules":"{\"inputExpressionList\":[\"input\"],\"outputs\":[\"output\"],\"outputValues\":[\"\"],\"ruleList\":[[\"\\\"yes\\\"\",\"true\"],[\"\\\"no\\\"\",\"false\"]],\"hitPolicy\":\"U\",\"inputValues\":[\"\"]}"} ;

    var validData = {"Decision Table 1":"decision table(input expression list : ['inp1'],outputs : \"Output0\",input values list : [[\"a\"]],output values : [[\"A\"]],rule list : [['\"b\"','\"B\"']],id : 'Decision Table 1',hit policy : 'U')"};
    // var incorrectData = {"name":"TestTable","decisionRules":"{\"inputExpressionList\":[\"input\"],\"outputs\":[\"output\"],\"outputValues\":[\"\"],\"ruleList\":[[\"\\yes\\\"\",\"true\"],[\"\\\"no\\\"\",\"false\"]],\"hitPolicy\":\"U\",\"inputValues\":[\"\"]}"} ;

    Promise.all(
      [validData]
      .map(data => new Promise(
        (resolve, reject) => DecisionGraph.validate(data, testContext, (err, output) => {
            expect(err).to.be.null;
            resolve(output);
          })
        )
      )
    )
    .then(results => {
      expect(results.length).to.equal(1);
      // var incorrectOutput = results[0];
      // var validOutput = results[1];

      // expect(Object.keys(incorrectOutput).some(key => incorrectOutput[key].isValid === false), 'incorrect data should produce some error, but did not').to.be.true;
      // expect(Object.keys(validOutput).every(key => validOutput[key].isValid === true), 'valid data has produced some error but should not').to.be.true;
      expect(results.every(
        result => 
          Object.keys(result).every(
            key => result[key].valid
          )
      )).to.be.true
      done();
    })
    .catch(done);
  });
});