const packageJson = require('./package.json');

const http = require('http');
const axios = require('axios');

const handleInternal = require('./handleInternal');
const handleExternal = require('./handleExternal');

function canhazdb (options) {
  const url = `http://${options.host}:${options.port}`;

  const state = {
    nodes: [{
      url,
      info: {
        version: packageJson.version
      }
    }],

    data: {}
  };

  const server = http.createServer((request, response) => {
    if (request.url.startsWith('/_')) {
      handleInternal(state, request, response);
      return;
    }

    handleExternal(state, request, response);
  });

  server.listen(options.port);

  return new Promise((resolve) => {
    server.on('listening', () => {
      resolve({
        url,

        state,

        join: async url => {
          if (state.nodes.find(node => node.url === url)) {
            return;
          }

          const request = await axios(`${url}/_info`);
          state.nodes.push({
            url,
            info: request.data
          });
        },

        close: server.close.bind(server)
      });
    });
  });
}

module.exports = canhazdb;
