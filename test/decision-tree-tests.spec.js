var chai = require('chai');
chai.use(require('chai-things'));
var loopback = require('loopback');
var expect = chai.expect;
var fs = require('fs');
var path = require('path');
var bootstrapped = require('./bootstrapper');
var http = require('http');
var clone = require('deepcopy');

var decisionTableData = require('./test-data/DecisionTableData.json');
var decisionTreeData = require('./test-data/DecisionTreeData.json');


var payload_1 = {
  "userName":"user1",
  "amount": 3000,
  "type":"PERSONAL_LOAN",
  "experience" : 5 ,
  "monthlyIncome":1000
}

var payload_2 = {
  "userName":"user2",
	"amount": 3000,
	"type":"PERSONAL_LOAN",
	"experience" : 5 ,
	"totalOtherIncome":100,
	"monthlyIncome":100,
	"employmentType":"FULL_TIME"

}


describe('DecisionTree Model Tests', () => {
    var DecisionTree;
    var BaseUser;
    var testContext = {
      ctx: {
        tenantId: 'test-tenant'
      }
    };

    before('wait for boot', function (done) {
        // this.timeout(8000)
        bootstrapped.then(() => {
          DecisionTree = loopback.findModel('DecisionTree');
          DecisionTable = loopback.findModel('DecisionTable');
      
          expect(DecisionTable).to.not.be.undefined;
          expect(DecisionTree).to.not.be.undefined;
          done();
        })
          .catch(done);
      });

      it('should insert a decision table json directly', function (done) {
     
        DecisionTable.create(decisionTableData, testContext, (err) => {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });

      it('should insert a decision tree json directly', function (done) {
     
        DecisionTree.create(decisionTreeData, testContext, (err) => {
          if (err) {
            done(err);
          } else {
            done();
          }
        });
      });

      it('should assert that a find() operation should fetch properties which are hidden', done => {
        DecisionTree.find({}, testContext, (err, results) => {
          if (err) {
            done(err);
          } else {
            expect(Array.isArray(results)).to.equal.true;
            expect(results.length >= 1, 'no items in the returned data').to.be.true;
        
            var nonExpectantFields = ['rootNodeId'];
            results.forEach(item => {
               nonExpectantFields.forEach(field => expect(item.__data, `Object has "${field}" as property`).to.have.property(field));
            });
            done();
          }
        });
      });

      it('should check for correct root node result', done => {
        DecisionTree.find({}, testContext, (err, results) => {
          if (err) {
            done(err);
          } else {
            expect(Array.isArray(results)).to.equal.true;
            expect(results.length >= 1).to.be.true;
            expect(results[0].rootNodeId).to.eql('n-rkljn4byr');
            done();
          }
        });
      });
    

      it('should execute a decision tree and give the correct result for payload_1', function (done) {

        DecisionTree.exec('TestTree', payload_1, testContext, (err, result) => {
          if (err) {
            done(err);
          } else {
            expect(result).to.eql({
              "location": "US",
              "preApproved": false,
              "eligibility": 3000
            });
            done();
          }
        });
      });

      
      it('should execute a decision tree and give the correct result for payload_2', function (done) {

        DecisionTree.exec('TestTree', payload_2, testContext, (err, result) => {
          if (err) {
            done(err);
          } else {
            expect(result).to.eql({
              "location": "FR",
              "preApproved": false,
              "eligibility": 800
            });
            done();
          }
        });
      });

      it('Should fail to execute decision tree as decision tree data is not proper', function (done) {
        DecisionTree.exec('invalidDecisionTreeName', {}, testContext, function (err, res) {
          expect(err).not.to.be.undefined;
          expect(err.message).to.equal('No Name found for Tree Name invalidDecisionTreeName');
          done();
        });
      });



});