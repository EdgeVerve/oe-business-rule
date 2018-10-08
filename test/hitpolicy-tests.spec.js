
var chai = require('chai');
chai.use(require('chai-things'));
var loopback = require('loopback');
var expect = chai.expect;
var fs = require('fs');
var path = require('path');
var bootstrapped = require('./bootstrapper');
var async = require('async');
var clone = require('deepcopy');

describe("Decision Table Hit Policy Tests", () => {
  var testContext = {
    ctx: {
      tenantId: 'test-tenant'
    }
  };
  var DecisionTable;
  before('wait for boot', function(done){
    bootstrapped.then(() => {
      DecisionTable = loopback.findModel('DecisionTable');
      expect(DecisionTable).to.not.be.undefined;
      done();
    });
  });

  before('Create DecisionTables', function(done) {
    this.timeout(5000);
    fs.readFile(path.join(__dirname, 'business-rule-data', 'DecisionTable.json'), function(err, data) {
      if (err) {
        done(err)
      } else {
        DTData = JSON.parse(data);
        async.each(DTData, function(decisionTable, callback) {
          // console.log('Before Create:', decisionTable.name)
          // context = clone(testContext);
          var { name, document: { documentName, documentData }} = decisionTable;
          // console.log('Name:', name);
          var obj = { name, documentName, documentData };
          DecisionTable.create(obj, testContext, function(err, data) {
            if (err) {
              // console.log(err);
              callback(err);
            } else {
              // console.log('After Create:', decisionTable.name);
              // console.log('data:', data.__data.name);
              callback();
            }
          });
        }, function(err) {
          if (err) {
            // console.log(err);
            done(err);
          } else {
            done();
          }
        });
      }

    });
  });

  it('Priority hit policy', function(done) {
    var payload = {
      "Applicant Age": 70,
      "Medical History": "bad"
    };
    DecisionTable.exec("ApplicantRiskRating", payload, testContext, function(err, result) {
      if (err) {
        done(err)
      } else {
        expect(result['Applicant Risk Rating']).to.equal("High");
        done();
      }
    });
  });

  it('Output hit policy', function(done) {
    var payload = {
      "Age": 18,
      "Risk category": "High",
      "Debt review": false
    };
    // debugger;
    DecisionTable.exec("RoutingRulesOutput", payload, testContext, function(err, result) {
      if (err) {
        done(err);
      } else {
        expect(result.Routing.length).to.be.equal(2);
        expect(result.Routing[1]).to.contain('Accept');
        expect(result.Routing[0]).to.contain('Refer');

        expect(result['Review level'].length).to.be.equal(2);
        expect(result['Review level'][1]).to.contain('None');
        expect(result['Review level'][0]).to.contain('Level1');

        expect(result.Reason.length).to.be.equal(2);
        expect(result.Reason[1]).to.contain('Acceptable');
        expect(result.Reason[0]).to.contain('High risk application');

        done();
      }
    });
  });

  it('Collect hit policy without any operator', function(done) {
    var payload = {
      "Age": 18,
      "Risk category": "High",
      "Debt review": false
    };
    DecisionTable.exec("RoutingRules", payload, testContext, function(err, result) {
      if (err) {
        done(err);
      } else {
        expect(result.Routing.length).to.be.equal(2);
        expect(result.Routing).to.contain('Accept');
        expect(result.Routing).to.contain('Refer');

        expect(result['Review level'].length).to.be.equal(2);
        expect(result['Review level']).to.contain('None');
        expect(result['Review level']).to.contain('Level1');

        expect(result.Reason.length).to.be.equal(2);
        expect(result.Reason).to.contain('Acceptable');
        expect(result.Reason).to.contain('High risk application');

        done();
      }
    });
  });

  it('Collect hit policy with + operator for numbers', function(done) {
    var payload = {
      "State": "Karnataka",
      "Units": 150
    };
    DecisionTable.exec("ElectricityBill", payload, testContext, function(err, result) {
      if (err) {
        done(err)
      } else {
        expect(result.Amount).to.equal(693);
        done();
      }
    });
  });

  it('Collect hit policy with < operator for numbers', function(done) {
    var payload = {
      "Age": 100,
      "Years of Service": 200
    };
    DecisionTable.exec("HolidaysMin", payload, testContext, function(err, result) {
      if (err) {
        done(err)
      } else {
        expect(result.Holidays).to.equal(3);
        done();
      }
    });
  });

  it('Collect hit policy with > operator for numbers', function(done) {
    var payload = {
      "Age": 100,
      "Years of Service": 200
    };
    DecisionTable.exec("HolidaysMax", payload, testContext, function(err, result) {
      if (err) {
        done(err)
      } else {
        expect(result.Holidays).to.equal(22);
        done();
      }
    });
  });

  it('Collect hit policy with # operator for numbers', function(done) {
    var payload = {
      "Age": 100,
      "Years of Service": 200
    };
    DecisionTable.exec("HolidaysCount", payload, testContext, function(err, result) {
      if (err) {
        done(err)
      } else {
        expect(result.Holidays).to.equal(3);
        done();
      }
    });
  });

  it('Collect hit policy with + operator for strings', function(done) {
    var payload = {
      "loanAmount": 2000,
      "salary": 20000
    };
    DecisionTable.exec("MembershipSum", payload, testContext, function(err, result) {
      if (err) {
        done(err)
      } else {
        expect(result.membership).to.equal("SILVER GENERAL GENERAL");
        done();
      }
    });
  });

  it('Collect hit policy with < operator for strings', function(done) {
    var payload = {
      "loanAmount": 30000,
      "salary": 60000
    };
    DecisionTable.exec("MembershipMin", payload, testContext, function(err, result) {
      if (err) {
        done(err)
      } else {
        expect(result.membership).to.equal("GENERAL");
        done();
      }
    });
  });

  it('Collect hit policy with > operator for strings', function(done) {
    var payload = {
      "loanAmount": 12000,
      "salary": 110000
    };
    DecisionTable.exec("MembershipMax", payload, testContext, function(err, result) {
      if (err) {
        done(err);
      } else {
        expect(result.membership).to.equal("SILVER");
        done();
      }
    });
  });

  it('Collect hit policy with # operator for strings', function(done) {
    var payload = {
      "loanAmount": 1000,
      "salary": 200000
    };
    DecisionTable.exec("MembershipCount", payload, testContext, function(err, result) {
      if (err) {
        done(err)
      } else {
        expect(result.membership).to.equal(4);
        done();
      }
    });
  });

  it('Collect hit policy with + operator for boolean', function(done) {
    var payload1 = {
      "age": 40,
      "salary": 55000
    }; //T, T
    var payload2 = {
      "age": 18,
      "salary": 6000
    }; //F, F
    var payload3 = {
      "age": 30,
      "salary": 55000
    }; //T, T, F
    DecisionTable.exec("LoanEligibilitySum", payload3, testContext, function(err3, result3) {
      if (err3) {
        done(err3);
        return
      }
      expect(result3.LoanEligibility).to.equal(false);
      DecisionTable.exec("LoanEligibilitySum", payload2, testContext, function(err2, result2) {
        if (err2) {
          done(err2);
          return;
        }
        expect(result2.LoanEligibility).to.equal(false);
        DecisionTable.exec("LoanEligibilitySum", payload1, testContext, function(err1, result1) {
          if (err1) {
            done(err1);
            return;
          }
          expect(result1.LoanEligibility).to.equal(true);
          done();
        });
      });
    });
  });

  it('Collect hit policy with < operator for boolean', function(done) {
    var payload1 = {
      "age": 40,
      "salary": 55000
    }; //T, T
    var payload2 = {
      "age": 18,
      "salary": 6000
    }; //F, F
    var payload3 = {
      "age": 30,
      "salary": 55000
    }; //T, T, F
    DecisionTable.exec("LoanEligibilityMin", payload3, testContext, function(err3, result3) {
      if (err3) {
        return done(err3);
      }
      expect(result3.LoanEligibility).to.equal(0);
      DecisionTable.exec("LoanEligibilityMin", payload2, testContext, function(err2, result2) {
        if (err2) {
          return done(err2);
        }
        expect(result2.LoanEligibility).to.equal(0);
        DecisionTable.exec("LoanEligibilityMin", payload1, testContext, function(err1, result1) {
          if (err1) {
            return done(err1);
          }
          expect(result1.LoanEligibility).to.equal(1);
          done();
        });
      });
    });
  });

  it('Collect hit policy with > operator for boolean', function(done) {
    var payload1 = {
      "age": 40,
      "salary": 55000
    }; //T, T
    var payload2 = {
      "age": 18,
      "salary": 6000
    }; //F, F
    var payload3 = {
      "age": 30,
      "salary": 55000
    }; //T, T, F
    DecisionTable.exec("LoanEligibilityMax", payload3, testContext, function(err3, result3) {
      if (err3) {
        return done(err3);
      }
      expect(result3.LoanEligibility).to.equal(1);
      DecisionTable.exec("LoanEligibilityMax", payload2, testContext, function(err2, result2) {
        if (err2) {
          return done(err2);
        }
        expect(result2.LoanEligibility).to.equal(0);
        DecisionTable.exec("LoanEligibilityMax", payload1, testContext, function(err1, result1) {
          if (err1) {
            return done(err1);
          }
          expect(result1.LoanEligibility).to.equal(1);
          done();
        });
      });
    });
  });

  it('Collect hit policy with # operator for boolean', function(done) {
    var payload1 = {
      "age": 40,
      "salary": 55000
    }; //T, T
    var payload2 = {
      "age": 18,
      "salary": 6000
    }; //F, F
    var payload3 = {
      "age": 30,
      "salary": 55000
    }; //T, T, F
    DecisionTable.exec("LoanEligibilityCount", payload3, testContext, function(err3, result3) {
      if (err3) {
        return done(err3);
      }
      expect(result3.LoanEligibility).to.equal(2);
      DecisionTable.exec("LoanEligibilityCount", payload2, testContext, function(err2, result2) {
        if (err2) {
          return done(err2);
        }
        expect(result2.LoanEligibility).to.equal(1);
        DecisionTable.exec("LoanEligibilityCount", payload1, testContext, function(err1, result1) {
          if (err1) {
            return done(err1);
          }
          expect(result1.LoanEligibility).to.equal(1);
          done();
        });
      });
    });
  });

});