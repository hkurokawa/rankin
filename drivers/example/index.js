
var util = require('../../lib/util');

module.exports.init = function(esClient, parameters, driver_data) {
  var state = {};

  set_state_value('index_pattern', state, parameters, '*');

	return state;
}

module.exports.no_op = function(esClient, state, driver_data, operation_parameters, result_callback) {
  result_callback( { 'result_code': 'OK' } );  
}

module.exports.count = function(esClient, state, driver_data, operation_parameters, result_callback) {
  var index_pattern = state['index_pattern'];

  if(operation_parameters.index_pattern) {
    index_pattern = operation_parameters.index_pattern;
  }

  esClient.count({
    index: index_pattern,
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback( { 'result_code': 'ERROR' } );
    }

    result_callback( { 'result_code': 'OK', 'count': response.count } );
  });
}

module.exports.ping = function(esClient, state, driver_data, operation_parameters, result_callback) {
  esClient.ping({
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    result_callback('OK');
  });
}

module.exports.cluster_health = function(esClient, state, driver_data, operation_parameters, result_callback) {
  esClient.cluster.health({
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    result_callback( { 'result_code': 'OK', 'cluster_status': response.status } );
  });
}

module.exports.cluster_stats = function(esClient, state, driver_data, operation_parameters, result_callback) {
  esClient.cluster.stats({
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }

    result_callback( { 'result_code': 'OK', 'cluster_stats': response } );
  });
}

module.exports.index_size = function(esClient, state, driver_data, operation_parameters, result_callback) {
  var index_pattern = state['index_pattern'];

  if(operation_parameters.index_pattern) {
    index_pattern = operation_parameters.index_pattern;
  }

  esClient.indices.stats({
    index: index_pattern,
    metric: "store",
    level: "indices",
    requestTimeout: 30000
  }, function (error, response) {
    if (error) {
      result_callback('ERROR');
    }
  
    if(response["_all"]["primaries"]["store"]["size_in_bytes"] && response["_all"]["total"]["store"]["size_in_bytes"]) {
      var primary_size = response["_all"]["primaries"]["store"]["size_in_bytes"];
      var total_size = response["_all"]["total"]["store"]["size_in_bytes"];

      result_callback( { 'result_code': 'OK', 'primary_size': primary_size, "total_size": total_size } );
    } else {
      result_callback('ERROR');
    }
  });
}

function set_state_value(name, state, parameters, default_value) {
  if (parameters && parameters[name]) {
    state[name] = parameters[name];
  } else {
    state[name] = default_value;
  }
}
	