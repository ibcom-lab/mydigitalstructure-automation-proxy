/*
	Help @ https://learn-next.mydigitalstructure.cloud/learn-function-automation

    Use https://console.mydigitalstructure.cloud > AUTOMATIONS
    to set up the controllers that this proxy can run for you
    via a CloudWatch Event, API Gateway
    or invocition using https://docs.mydigitalstructure.cloud/CORE_OTHER_SERVICE_AWS_LAMBDA
	
  	To run local use https://www.npmjs.com/package/lambda-local:

	lambda-local -l index.js -t 9000 -e event.json
*/

exports.handler = function (event, context, callback)
{
    global.mydigitalstructure = require('mydigitalstructure')
	global._ = require('lodash')
	global.moment = require('moment');

	mydigitalstructure.set(
	{
		scope: '_event',
		value: event
	});

    mydigitalstructure._util.message(event);

	mydigitalstructure.set(
	{
		scope: '_callback',
		value: callback
	});

	mydigitalstructure.init(main);
	mydigitalstructure._util.message('Using mydigitalstructure module version ' + mydigitalstructure.VERSION);

    function main(err, data)
    {
        mydigitalstructure.add(
        {
            name: 'util-factory-load-from-cloud',
            notes: 'Get automation first',
            code: function (param, response)
            {
                var event = mydigitalstructure.get({scope: '_event'});
                var okToContinue = false;
            
                if (event.automationGUID != undefined
                    || event.automationUUID != undefined
                    || event.automationTitle != undefined)
                {
                    okToContinue = true;
                }

                if (!okToContinue)
                {
                    console.log('Missing Automation Details!');
                }
                else
                {
                    if (response == undefined)
                    {
                        var filters = [];

                        if (event.automationID != undefined)
                        {
                            filters.push(
                            {
                                field: 'id',
                                value: event.automationID
                            });
                        }

                        if (event.automationUUID != undefined)
                        {
                            filters.push(
                            {
                                field: 'guid',
                                value: event.automationUUID
                            });
                        }

                        if (event.automationTitle != undefined)
                        {
                            filters.push(
                            {
                                field: 'title',
                                value: event.automationTitle
                            });
                        }

                        mydigitalstructure.cloud.search(
                        {
                            object: 'setup_automation',
                            fields:
                            [
                                {name: 'title'},
                                {name: 'type'}
                            ],
                            filters: filters,
                            all: true,
                            callback: 'util-factory-load-from-cloud',
                            callbackParam: param
                        });
                    }
                    else
                    {
                        if (response.data.rows.length == 0)
                        {
                            console.log('Can not find automation!')
                        }
                        else
                        {
                            event.automationID = mydigitalstructure.set(
                            {
                                scope: 'util-factory-load-from-cloud',
                                context: 'automation-id',
                                value: _.first(response.data.rows).id
                            });

                            mydigitalstructure.invoke('util-factory-load-from-cloud-controllers');
                        }
                    }
                }
            }
        });

        mydigitalstructure.add(
        {
            name: 'util-factory-load-from-cloud-controllers',
            code: function (param, response)
            {
                var event = mydigitalstructure.get({scope: '_event'});
                var okToContinue = false;

                if (event.invokeControllerName != undefined)
                {
                    okToContinue = true;
                }

                if (!okToContinue)
                {
                    console.log('!! There is no controller to invoke [invokeControllerName].');
                }
                else
                {
                    event.automationID = mydigitalstructure.get(
                    {
                        scope: 'util-factory-load-from-cloud',
                        context: 'automation-id'
                    });

                    if (response == undefined)
                    {
                        var filters = [];

                        if (event.automationID != undefined)
                        {
                            filters.push(
                            {
                                field: 'automation',
                                value: event.automationID
                            });
                        }

                        if (event.controllerName != undefined)
                        {
                            filters.push(
                            {
                                field: 'name',
                                value: event.controllerName
                            });
                        }

                        if (event.controllerUUID != undefined)
                        {
                            filters.push(
                            {
                                field: 'name',
                                value: event.controllerUUID
                            });
                        }

                        if (event.controllerVersion != undefined)
                        {
                            filters.push(
                            {
                                field: 'version',
                                value: controllerVersion
                            });
                        }

                        mydigitalstructure.cloud.search(
                        {
                            object: 'setup_automation_controller',
                            fields:
                            [
                                {name: 'automation'},
                                {name: 'name'},
                                {name: 'notes'},
                                {name: 'version'},
                                {name: 'status'},
                                {name: 'role'},
                                {name: 'parameters'},
                                {name: 'code'}
                            ],
                            filters: filters,
                            all: true,
                            callback: 'util-factory-load-from-cloud-controllers',
                            callbackParam: param
                        });
                    }
                    else
                    {
                        if (response.data.rows.length == 0)
                        {
                            console.log('No controllers!')
                        }
                        else
                        {
                            learnfactoryControllers = response.data.rows;
                            var controllers = [];
                        
                            _.each(learnfactoryControllers, function(learnfactoryController)
                            {
                                learnfactoryController.code = _.unescape(learnfactoryController.code);
                                if (_.startsWith(learnfactoryController.code, 'function'))
                                {
                                    learnfactoryController._code = _.split(learnfactoryController.code, ')');
                                    learnfactoryController._arguments = _.split(_.first(learnfactoryController._code), '(');
                                    learnfactoryController._arguments = _.last(learnfactoryController._arguments);

                                    learnfactoryController._code.shift();
                                    learnfactoryController._codeBody = _.join(learnfactoryController._code, ')');
                                }
                                else
                                {
                                    learnfactoryController._codeBody = learnfactoryController.code;
                                    learnfactoryController._arguments = learnfactoryController.parameters;
                                }
                            
                                controllers.push( 
                                {
                                    name: learnfactoryController.name,
                                    code: new Function(learnfactoryController._arguments, learnfactoryController._codeBody)
                                });
                            });
   
                            console.log(controllers)

                            mydigitalstructure.add(controllers);

                            //mydigitalstructure.invoke('util-end', {status: 'ADDED'});

                            mydigitalstructure.invoke('util-using-factory-from-object-cloud-invoke');
                        }
                    }
                }
            }
        });

        mydigitalstructure.add(
        {
            name: 'util-using-factory-from-object-cloud-invoke',
            code: function (param, response)
            {
                var event = mydigitalstructure.get({scope: '_event'});
                var settings = mydigitalstructure.get({scope: '_settings'});

                if (response == undefined)
                {
                    var notes = 'Controller [' + event.invokeControllerName + '] invoked';

                    if (event.invokeControllerParam != undefined && event.invokeControllerParam != '')
                    {
                        notes = notes + ' with parameters [' + JSON.stringify(event.invokeControllerParam) + '] '
                    }

                    notes = notes + ' by [' + settings.mydigitalstructure.logon + '].'

                    mydigitalstructure.cloud.save(
                    {
                        object: 'setup_automation_scheduler_log',
                        data:
                        {
                            automation: event.automationID,
                            notes: notes 
                        },
                        callback: 'util-using-factory-from-object-cloud-invoke',
                        callbackParam: param
                    });
                }
                else
                {
                    mydigitalstructure.invoke(event.invokeControllerName, event.invokeControllerParam);
                }
            }
        });

        mydigitalstructure.add(
        {
            name: 'learn-using-factory-from-object-cloud',
            code: function (param)
            {
                mydigitalstructure.invoke('util-factory-load-from-cloud');
            }
        });

        //-- UTIL controllers

		mydigitalstructure.add(
        {
            name: 'util-end',
            code: function (data, error)
            {
                var callback = mydigitalstructure.get(
                {
                    scope: '_callback'
                });

                if (error == undefined) {error = null}

                if (callback != undefined)
                {
                    callback(error, data);
                }
            }
        });

        mydigitalstructure.add(
        {
            name: 'util-automation-controller-end',
            code: function (param, response)
            {
                if (_.isPlainObject(param))
                {
                    param = JSON.stringify(param);
                }

                if (response == undefined)
                {
                    var event = mydigitalstructure.get({scope: '_event'});

                    var notes = 'Controller [' + event.invokeControllerName + '] ended with [' + param + ']';

                    mydigitalstructure.cloud.save(
                    {
                        object: 'setup_automation_scheduler_log',
                        data:
                        {
                            automation: event.automationID,
                            notes: notes 
                        },
                        callback: 'util-automation-controller-end',
                        callbackParam: param
                    });
                }
                else
                {
                    mydigitalstructure.invoke('util-end', param);
                }
            }
        });

        mydigitalstructure.invoke('learn-using-factory-from-object-cloud');
    }
}