const axios = require('axios');
const uuid = require('uuid').v4;
const writeResponse = require('write-response');
const finalStream = require('final-stream');

const selectRandomItemFromArray = require('./utils/selectRandomItemFromArray');

async function handleGetOne (state, request, response, { collectionId, resourceId }) {
  const responses = await Promise.all(
    state.nodes
      .map(node => {
        return axios(`${node.url}/_internal/${collectionId}/${resourceId}`, {
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

async function handleGetAll (state, request, response, { collectionId, url }) {
  const lookupResponses = await Promise.all(
    state.nodes
      .map(node => {
        return axios(`${node.url}/_internal/${collectionId}${url.search}`, {
          validateStatus: status => [200, 404].includes(status)
        });
      })
  );

  const ids = lookupResponses
    .map(response => response.data)
    .flat()
    .filter(item => item.id)
    .map(item => item.id);

  if (ids.length === 0) {
    writeResponse(200, [], response);
    return;
  }

  const fullResponses = await Promise.all(
    state.nodes
      .map(node => {
        return axios(`${node.url}/_internal/${collectionId}?ids=${ids.join(',')}`, {
          validateStatus: status => [200, 404].includes(status)
        });
      })
  );

  const fullResponsesData = fullResponses.map(r => r.data).flat();

  const keyed = fullResponsesData.reduce((keyed, data) => {
    keyed[data.id] = keyed[data.id] || {};
    Object.assign(keyed[data.id], data);
    return keyed;
  }, {});

  const results = Object.values(keyed);

  writeResponse(200, results, response);
}

async function handlePost (state, request, response, { collectionId }) {
  const body = await finalStream(request).then(JSON.parse);
  const resourceId = uuid();

  const postsPromises = Object.keys(body).map(key => {
    const node = selectRandomItemFromArray(state.nodes);

    return axios(`${node.url}/_internal/${collectionId}/${resourceId}`, {
      method: 'PUT',
      data: {
        [key]: body[key]
      }
    });
  });

  await Promise.all(postsPromises);

  writeResponse(201, {
    id: resourceId,
    ...body
  }, response);
}

async function handlePut (state, request, response, { collectionId, resourceId }) {
  const body = await finalStream(request).then(JSON.parse);

  const cleanup = state.nodes.map(node => {
    return axios(`${node.url}/_internal/${collectionId}/${resourceId}`, {
      method: 'DELETE'
    });
  });

  await Promise.all(cleanup);

  const postsPromises = Object.keys(body).map(key => {
    const node = selectRandomItemFromArray(state.nodes);

    return axios(`${node.url}/_internal/${collectionId}/${resourceId}`, {
      method: 'PUT',
      data: {
        [key]: body[key]
      }
    });
  });

  await Promise.all(postsPromises);

  writeResponse(201, {
    id: resourceId,
    ...body
  }, response);
}

async function handleDelete (state, request, response, { collectionId, resourceId }) {
  const cleanup = state.nodes.map(node => {
    return axios(`${node.url}/_internal/${collectionId}/${resourceId}`, {
      method: 'DELETE'
    });
  });

  await Promise.all(cleanup);

  response.writeHead(200);
  response.end();
}

function handleExternal (state, request, response) {
  const url = new URL(request.url, 'http://localhost');

  const [, collectionId, resourceId] = url.pathname.split('/');

  if (request.method === 'GET' && resourceId) {
    handleGetOne(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'GET' && !resourceId) {
    handleGetAll(state, request, response, { collectionId, url });
    return;
  }

  if (request.method === 'POST') {
    handlePost(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'PUT') {
    handlePut(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'DELETE') {
    handleDelete(state, request, response, { collectionId, resourceId });
    return;
  }

  response.writeHead(404);
  response.end();
}

module.exports = handleExternal;
