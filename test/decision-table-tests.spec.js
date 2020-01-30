// var oecloud = require('oe-cloud');
var chai = require('chai');
chai.use(require('chai-things'));
var loopback = require('loopback');
var expect = chai.expect;
var fs = require('fs');
var path = require('path');
var bootstrapped = require('./bootstrapper');
var {
  fetchXLSBase64
} = require('./test-utils');
var http = require('http');
var clone = require('deepcopy');

describe('DecisionTable Model Tests', () => {
  var DecisionTable;
  var BaseUser;
  var testContext = {
    ctx: {
      tenantId: 'test-tenant'
    }
  };

  before('wait for boot', function (done) {
    // this.timeout(8000)
    bootstrapped.then(() => {
      DecisionTable = loopback.findModel('DecisionTable');
      BaseUser = loopback.findModel('User');

      expect(DecisionTable).to.not.be.undefined;
      expect(BaseUser).to.not.be.undefined;

      done();
    })
      .catch(done);
  });

  // obsolete
  it('Should fail to create decision table as base64 validation of decision data is violated', function (done) {
    // var decisionTableData = {
    //   "name": "sample",
    //   "document": {
    //     "documentName": "sample.xlsx",
    //     "documentData": "wrong decision data"
    //   }
    // }

    var decisionTableData = {
      'name': 'sample',
      'documentName': 'sample.xlsx',
      'documentData': 'wrong decision data'

    };
    DecisionTable.create(decisionTableData, testContext, function (err, res) {
      expect(err).not.to.be.undefined;
      expect(err.message).to.equal('Decision table data provided is not a base64 encoded string');
      done();
    });
  });

  it('Should fail to create decision table as decision data is not correct', function (done) {
    // var decisionTableData = {
    //   "name": "sample",
    //   "document": {
    //     "documentName": "sample.xlsx",
    //     "documentData": "base64"
    //   }
    // }
    var decisionTableData = {
      'name': 'sample',
      'documentName': 'sample.xlsx',
      'documentData': 'base64'
    };

    DecisionTable.create(decisionTableData, testContext, function (err, res) {
      // console.log(err);
      expect(err).not.to.be.undefined;
      expect(err.message).to.equal('Decision table data provided could not be parsed, please provide proper data');
      done();
    });
  });

  it('Should fail to execute decision table as decision table data is not proper', function (done) {
    DecisionTable.exec('invalidTableName', {}, testContext, function (err, res) {
      expect(err).not.to.be.undefined;
      expect(err.message).to.equal('No Document found for DocumentName invalidTableName');
      done();
    });
  });
  var decisonFileName;
  var decisionName;
  it('should insert a decision from an excel file which is valid', done =>{
    var fileContents = fs.readFileSync(path.join(__dirname, 'business-rule-data/DecisionTable.json'), {encoding: 'utf8'});
    var data = JSON.parse(fileContents);
    var { name, document: { documentData, documentName }} = data[0];
    name += '1';
    decisionName = name;
    var record = { name, documentData, documentName };
    DecisionTable.create(record, testContext, (err, newInstance) => {
      if (err) {
        done(err);
      } else {
        expect(newInstance.name).to.equal(name);
        // console.log('documentName:', documentName);
        decisonFileName = documentName;
        expect('decisionRules' in newInstance.__data, 'decisionRules property is absent').to.be.true;
        done();
      }
    });
  });

  it('should assert that a find() operation should fetch properties which are hidden', done => {
    DecisionTable.find({}, testContext, (err, results) => {
      if (err) {
        done(err);
      } else {
        expect(Array.isArray(results)).to.equal.true;
        // expect('length' in results).to.equal.true;
        // console.log(results.length)
        expect(results.length >= 1, 'no items in the returned data').to.be.true;
        var nonExpectantFields = ['documentName', 'documentData'];
        results.forEach(item => {
          nonExpectantFields.forEach(field => expect(item.__data, `Object has "${field}" as property`).to.have.property(field));
        });
        done();
      }
    });
  });

  var accessToken;
  var recordId;
  it('should assert that http GET should normally not contain hidden fields in output response', done => {
    var newUserSpec = {
      port: 3000,
      path: '/api/Users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    var newUserInfo = { username: 'admin', password: 'admin', email: 'admin@admin.com' };

    var loginSpec = clone(newUserSpec);
    loginSpec.path = '/api/Users/login';

    var dtGetSpec = {
      path: '/api/DecisionTables',
      port: 3000
    };

    var newUserReq = http.request(newUserSpec, res => {
      expect(res.statusCode).to.equal(200);
      var loginReq = http.request(loginSpec, loginRes => {
        expect(loginRes.statusCode).to.equal(200);
        var data = '';
        loginRes.on('data', d=> data += d.toString('utf8'));
        loginRes.on('end', () => {
          var authToken = JSON.parse(data).id;
          accessToken = authToken;
          dtGetSpec.path += `?accessToken=${authToken}`;
          var getReq = http.request(dtGetSpec, getRes => {
            expect(getRes.statusCode).to.equal(200);
            var data2 = '';
            getRes.on('data', d => data2 += d);
            getRes.on('end', () => {
              var getResponse = JSON.parse(data2);
              // console.log('getResponse:', getResponse);
              getResponse.forEach(item => {
                // expect(item).to.not.have.property('decisionRules');
                expect(item).to.not.have.property('documentData');
                expect(item).to.not.have.property('documentName');
              });
              // recordId = getResponse[0].id; //since there is only one at this point...
              recordId = getResponse.filter(x => x.name === decisionName )[0].id;
              expect(recordId).to.be.defined;
              done();
            });
          });
          getReq.on('error', done);
          getReq.end();
        });
      });
      var loginCredentials = clone(newUserInfo);
      delete loginCredentials.email;
      loginReq.on('error', done);
      loginReq.write(JSON.stringify(loginCredentials));
      loginReq.end();
    });
    newUserReq.on('error', done);
    newUserReq.write(JSON.stringify(newUserInfo));
    newUserReq.end();
  }).timeout(3000);

  it('should assert that the HTTP endpoint for retrieving the excel file should return an object containing filename and base64 data', done => {
    var reqSpec = {
      port: 3000,
      path: `/api/DecisionTables/${recordId}/document?accessToken=${accessToken}`,
      method: 'GET'
    };
    // console.log('Path:', reqSpec.path);
    var req = http.request(reqSpec, res => {
      expect(res.statusCode).to.equal(200);
      var data = '';
      var i = 0;
      res.on('data', d => {
        // console.log('FRAME:', ++i);
        data += d.toString('utf8');
      });
      res.on('end', () => {
        var response = JSON.parse(data);
        expect(response).to.have.property('name');
        expect(response).to.have.property('data');
        expect(response.data).to.contain('base64');
        expect(response.name).to.equal(decisonFileName);
        done();
      });
    });
    req.on('error', done);
    req.end();
  }).timeout(120000);

  it('should be able to retrieve the parsed representation of an excel file containing a decision table', done => {
    var fileContents = fs.readFileSync(path.join(__dirname, 'business-rule-data/DecisionTable.json'), {encoding: 'utf8'});
    var data = JSON.parse(fileContents);
    var {name, document: { documentData } } = data[0];
    name += 1;
    DecisionTable.parseExcel({documentData}, testContext, (err, result) => {
      if (err) {
        done(err);
        return;
      }

      DecisionTable.findOne({ where: { name }}, testContext, (err, output) => {
        if (err) {
          done(err);
        } else {
          expect(typeof output.decisionRules).to.equal('string');
          expect(typeof result).to.equal('object');
          rulesObject = JSON.parse(output.decisionRules);
          // expect(Object.keys(result).every( key => result[key] === rulesObject[key] )).to.be.true;
          expect(result).to.deep.equal(rulesObject);
          done();
        }
      });
    });
  });

  it('should insert a decision table json directly (for rule designer use case)', done => {
    var inputData = {'name': 'TestTable', 'decisionRules': '{"inputExpressionList":["input"],"outputs":["output"],"outputValues":[""],"ruleList":[["\\"yes\\"","true"],["\\"no\\"","false"]],"hitPolicy":"U","inputValues":[""]}'};
    DecisionTable.create(inputData, testContext, (err) => {
      if (err) {
        done(err);
      } else {
        done();
      }
    });
  });
});
