# oe-business-rule

## Introduction

This oe-cloud module implements the business rule functionality. The most common way to represent a rule is via **decision tables**.
We additionally allow rules to be represented hierarchially via a concept called **decision graphs and services**. Both are accessed
through different APIs.

This module extensively makes use of js-feel business rule engine.

Traditionally decision tables are written in excel files, and uploaded to the DecisionTable model. The rule is given a name and
invoked though the `DecisionTable.exec` remote method or its corresponding HTTP api endpoint.

When you are working with decision
graphs on the other hand, you compose your ruleset composing of various decision elements (rules) and expose decisions you are
interested in via a concept called **decision services**. Hence a decision service will always work in the context of a *decision graph*.
But, you require a full-fledged designer to compose decision graphs. This lets you visualize the relationships. This is another
oe-cloud module on its own. Alternatively, you can work with excel files for representing decision graphs and services, however,
they will not give you the visual experience required, and, it becomes tedious to understand the relationship between various
decision elements. However, decision graphs and services provide for a powerful and complex rule representations.

## How are rules actually implemented?

We currently make use of js-feel javascript DMN based rule engine to execute decisions.

We have somewhat adopted the DMN v1.1 specification for the implementation. DMN stands for Decision Model and Notation. The
specification touches upon various topics, namely

1. What constitutes a rule or decision...i.e. the various components in a decision or a rule
2. FEEL - an expression language which can be used to represent
some calculation or simple logic-based branching in a decision
3. An xml document model which serves to as a means to exchange rules within say
an orgamization

We have implemented (1) and (2) somewhat. For (3) we have a custom JSON document model which represents rules. This document
only captures the decision elements, but they have no idea about inputs nodes, since they are entirely omitted in our
implementation. Further, they don't capture the information about relationships. Thankfully you wouldn't work with this
document directly. You would rely on a designer to generate this document for you. And it is easier that way.

Ideally this engine has to work standalone. The document that we feed into this engine should contain the rule in
"full". This means, we should have the data (or payload) and the rule or decisions encoded in the document. The FEEL
engine works nice this way. It doesn't have to search for variables as it is doing now to resolve its value. This makes
the rule engine self-sufficient and "pure". In other words, the rule engine does not affect or reach out to an
external system, in any capacity.

Our implemetation differs in the sense, we pass in a document representing the rules. And also, a payload. _Separately_. It is
evident in the APIs signatures. In this document, we have felt that Input decision nodes are not necessary, since the payload
somehow provides for that role in one such document. You may find many departures from the DMN specifications, but most of them
were not in vain.

That said, we do have a few cool features you would want in a rule engine that works in an enterprise:

## Notable Features

1. Working with relational data within rules
2. Support for external functions in rules
3. Support for model validations in oe-cloud
4. Support for standalone execution of rules - for use in business workflow or elsewhere.

## Getting started

### 0. Prerequisites

This module is depedent on oe-model-composite module. Hence make sure this module is added in your application's
**app-list.json** file.

### 1. Decision Tables

Refer to this document to know more about decision tables

To insert a decision table, we post JSON as follows to the **DecisionTable** model.

```
{
    "name":"<RuleName>",
    "document": {
        "documentName" : "<the_excel_file_having_the_decision_table>",
        "documentData" : "<base64_encoded_data_of_excel_file>"
    }
}
```
> Note: If done via HTTP, we do a POST to `/api/DecisionTables/`

To execute this rule, we call the `DecisionTable.exec` remote method or make a POST to `/api/DecisionTables/exec`
with the payload and the name of the rule

#### Example



### 2. Decision Graphs and Services

#### Example


## Towards standardization

Most of the work we have done above, while not fully standards compliant, have worked for us. But we do want to move towards
and industry standard. However, it is quite difficult to do this in a corporate environment where doing such work distracts
us from our main company vision. Ideally we would want people from all walks of life (sales, engineering, support, etc) read
the specification and deliberate on how things are to be implemented and used within an organization. I guess today, we are
at a stage where we should approach the standards body (OMG) with our suggestions and questions.

## Getting started

This module will give you the models and necessary http endpoints to execute business rules independently. Running this feature
independently gives the capability of doing other things like validations or making decision which can be used in other systems
or programs.

To use this module in a standalone fashion, you need to
## dependency
* [oe-cloud](https://github.com/EdgeVerve/oe-cloud)
* [oe-expression](https://github.com/EdgeVerve/oe-expression)
* [js-feel](https://github.com/EdgeVerve/feel)
* [js-feel-plugins](https://github.com/EdgeVerve/js-feel-plugins)
* [oe-validation](https://github.com/EdgeVerve/oe-validation)
