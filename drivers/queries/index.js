var util = require('../../lib/util');
var fs = require('fs');

module.exports.init = function (esClient, parameters, driver_data) {
  var state = {};

  set_state_value('index_pattern', state, parameters, '*');
  set_state_value('query_file', state, parameters, null);
  var file = state['query_file'];
  if (!file) {
    throw Error('query_file must be specified.');
  }

  state['query_file'] = file;
  state['query_json_list'] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  state['query_json_list_idx'] = 0;

  return state;
};

module.exports.query = function (esClient, state, driver_data, operation_parameters, result_callback) {
  var index_pattern = state['index_pattern'];

  if (operation_parameters.index_pattern) {
    index_pattern = operation_parameters.index_pattern;
  }

  var queries = state['query_json_list'];
  var idx = state['query_json_list_idx'];
  if (queries.length > 0) {
    var json = queries[idx];
    var query = JSON.parse(json);
    esClient.search({
      index: index_pattern,
      body: query
    }).then(function (resp) {
      result_callback({'result_code': 'OK', 'count': resp.hits.total, 'query_file': state['query_file'], 'idx': idx});
      idx++;
      if (idx >= queries.length) {
        idx -= queries.length;
      }
      state['query_json_list_idx'] = idx;
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
	