var cluster = require('cluster');
var util = require('../../lib/util');
var readLines = require('n-readlines');

module.exports.init = function (esClient, parameters, driver_data) {
  var state = {};

  set_state_value('index_pattern', state, parameters, '*');
  set_state_value('query_file', state, parameters, null);
  var file = state['query_file'];
  if (!file) {
    throw Error('query_file must be specified.');
  }
  var agent_id = cluster.worker.id;
  file = file + "_" + agent_id;

  state['query_file'] = file;
  state['query_file_reader'] = new readLines(file);
  state['query_json_file_line_number'] = 0;

  return state;
};

module.exports.query = function (esClient, state, driver_data, operation_parameters, result_callback) {
  var index_pattern = state['index_pattern'];

  if (operation_parameters.index_pattern) {
    index_pattern = operation_parameters.index_pattern;
  }

  var reader = state['query_file_reader'];
  var line = reader.next();
  if (!line) {
    // Reached to the end. Reopen the file and start from the head.
    reader = new readLines(state['query_file']);
    state['query_file_reader'] = reader;
    state['query_json_file_line_number'] = 0;
    line = reader.next();
  }

  if (line) {
    var query = JSON.parse(line);
    esClient.search({
      index: index_pattern,
      body: query
    }).then(function (resp) {
      var line_number = state['query_json_file_line_number'];
      result_callback({'result_code': 'OK', 'count': resp.hits.total, 'query_file': state['query_file'], 'line': line_number});
      state['query_json_file_line_number'] = line_number + 1;
    }, function (err) {
      result_callback({'result_code': 'ERROR', 'error': err});
    });
  } else {
    console.warn("Empty queries: " + state['query_file']);
  }
};

function set_state_value(name, state, parameters, default_value) {
  if (parameters && parameters[name]) {
    state[name] = parameters[name];
  } else {
    state[name] = default_value;
  }
}