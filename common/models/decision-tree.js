/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var logger = require('oe-logger');
var assert = require('assert');
var log = logger('decision-tree');
var util = require('util');
var loopback = require('loopback');
const vm = require('vm');


module.exports = function (decisionTree) {

    decisionTree.observe('before save', function decisionTreeBeforeSave(ctx, next) {
        var data = ctx.__data || ctx.instance || ctx.data;
        try {
            var decisionTreeConnectionArray = JSON.parse(JSON.stringify(data.connections));
            var from_array = [];
            var to_array = [];

            decisionTreeConnectionArray.forEach(function (item) {
                from_array.push(item.from);
                to_array.push(item.to);
            });

            for (var i in from_array) {
                if (!to_array.includes(from_array[i])) {
                    data.rootNodeId = from_array[i];
                }
            }
            next();

        } catch (err) {
            log.error(ctx.options, 'Error - Unable to process decision tree data -', err);
            next(new Error('Decision tree data provided could not be parsed, please provide proper data'));
        }
    });

    decisionTree.remoteMethod('exec', {
        description: 'execute a business rule',
        accessType: 'WRITE',
        accepts: [
            {
                arg: 'name',
                type: 'string',
                required: true,
                http: {
                    source: 'path'
                },
                description: 'Name of the Decision Tree to be fetched from db for rule engine'
            },
            {
                arg: 'data',
                type: 'object',
                required: true,
                http: {
                    source: 'body'
                },
                description: 'An object on which business rules should be applied'
            },
            {
                arg: 'options',
                type: 'object',
                http: 'optionsFromRequest'
            }
        ],
        http: {
            verb: 'post',
            path: '/exec/:name'
        },
        returns: {
            arg: 'data',
            type: 'object',
            root: true
        }
    });

    decisionTree.exec = function decisionTreeExec(
        name,
        data,
        options,
        callback
    ) {
        // var businessRuleEngine = 'evBusinessRule';
        if (typeof callback === 'undefined') {
            if (typeof options === 'function') {
                // execrule (documentName, data, callback)
                callback = options;
                options = {};
            }
        }

        data = data || {};
        options = options || {};
        callback = callback || utils.createPromiseCallback();

        assert(
            typeof name === 'string',
            'The decision tree name argument must be string'
        );
        assert(
            typeof data === 'object',
            'The data argument must be an object or array'
        );
        assert(
            typeof options === 'object',
            'The options argument must be an object'
        );
        assert(
            typeof callback === 'function',
            'The callback argument must be a function'
        );

        decisionTree.find(
            {
                where: {
                    name: name
                }
            },
            options,
            function decisionTreeFind(err, decisionTreeData) {
                if (err) {
                    callback(err);
                } else if (decisionTreeData.length) {
                    var root = '';
                    var nodes = [];
                    var connections = [];
                 
                    if (decisionTreeData[0].rootNodeId !== null) {
                        root = decisionTreeData[0].rootNodeId;
                    }
                    if (decisionTreeData[0].nodes !== null) {
                        nodes = decisionTreeData[0].nodes;
                    }
                    if (decisionTreeData[0].connections !== null) {
                        connections = decisionTreeData[0].connections;
                    }
                    traverseDecisionTree(root, nodes, connections, data, {}, options, callback);

                } else {
                    var err1 = new Error(
                        'No Name found for Tree Name ' + name
                    );
                    err1.retriable = false;
                    callback(err1);
                }
            }
        );
    };




    function traverseDecisionTree(root, nodes, connections, payload, result, options, done) {
        var updatedPayload = {};
        for (var k in nodes) {
            var ob = nodes[k];

            if (ob.id === root) {
                var rootName = ob.name;
                if (ob.nodeType !== 'DECISION_TABLE') {
                    updatedPayload = payload;
                    for (var i in connections) {

                        var obj = connections[i];
                        if (root === obj.from) {
                            if (obj.condition === "" || obj.condition === null) {
                                return traverseDecisionTree(obj.to, nodes, connections, updatedPayload, result, options, done);
                            }
                            else {
                                var isValid = evaluateCondition(updatedPayload, obj.condition);
                                if (isValid) {

                                    return traverseDecisionTree(obj.to, nodes, connections, updatedPayload, result, options, done);
                                }
                            }
                        }
                    }
                }
                else
                    if (ob.nodeType === 'DECISION_TABLE') {
                        var DecisionTreeModel = loopback.getModel('DecisionTable', options);
                        DecisionTreeModel.exec(rootName, payload, options, function (err, res) {
                            if (err) {
                                log.error(options, err.message);
                            }
                            updatedPayload = Object.assign(payload, res);
                            result = Object.assign(result, res);

                            for (var i in connections) {
                                var obj = connections[i];
                                if (root === obj.from) {
                                    if (obj.condition === "" || obj.condition === null) {

                                        return traverseDecisionTree(obj.to, nodes, connections, updatedPayload, result, options, done);
                                    }
                                    else {
                                        var isValid = evaluateCondition(updatedPayload, obj.condition);
                                        if (isValid) {
                                            return traverseDecisionTree(obj.to, nodes, connections, updatedPayload, result, options, done);
                                        }
                                    }
                                }
                            }

                            return done(null, result);
                        });
                    }
            }
        }
    }

    function evaluateCondition(payload, condition) {

     /*   var sandbox = {
            payload: payload
        };*/
        var sandbox = payload;
        var context = new vm.createContext(sandbox);
        var compiledScript = new vm.Script("this.output = (" + condition + ");");
        compiledScript.runInContext(context);
        return context.output;

    }

};
