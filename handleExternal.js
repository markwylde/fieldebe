const axios = require('axios');
const writeResponse = require('write-response');
const finalStream = require('final-stream');

const selectRandomItemFromArray = require('./utils/selectRandomItemFromArray');

async function handleGet (state, request, response) {
  const responses = await Promise.all(
    state.nodes
      .map(node => {
        return axios(`${node.url}/_internal${request.url}`, {
          validateStatus: status => [200, 404].includes(status)
        });
      })
  );

  const dataArray = Object.assign(...responses.map(r => r.data));

  if (!responses.find(response => response.status === 200)) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, dataArray, response);
}

async function handlePost (state, request, response) {
  const body = await finalStream(request).then(JSON.parse);

  const cleanup = state.nodes.map(node => {
    return axios(`${node.url}/_internal${request.url}`, {
      method: 'DELETE'
    });
  });

  await Promise.all(cleanup);

  const postsPromises = Object.keys(body).map(key => {
    const node = selectRandomItemFromArray(state.nodes);

    return axios(`${node.url}/_internal${request.url}`, {
      method: 'POST',
      data: {
        [key]: body[key]
      }
    });
  });

  await Promise.all(postsPromises);

  response.writeHead(201);
  response.end();
}

async function handleDelete (state, request, response) {
  const cleanup = state.nodes.map(node => {
    return axios(`${node.url}/_internal${request.url}`, {
      method: 'DELETE'
    });
  });

  await Promise.all(cleanup);

  response.writeHead(200);
  response.end();
}

function handleExternal (state, request, response) {
  if (request.method === 'GET') {
    handleGet(state, request, response);
    return;
  }

  if (request.method === 'POST') {
    handlePost(state, request, response);
    return;
  }

  if (request.method === 'DELETE') {
    handleDelete(state, request, response);
    return;
  }

  response.writeHead(404);
  response.end();
}

module.exports = handleExternal;
