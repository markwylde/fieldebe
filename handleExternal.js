const axios = require('axios');
const uuid = require('uuid').v4;
const writeResponse = require('write-response');
const finalStream = require('final-stream');
const assignDeep = require('assign-deep');

const selectRandomItemFromArray = require('./utils/selectRandomItemFromArray');

async function handleGet (state, request, response, { collectionId, resourceId }) {
  const responses = await Promise.all(
    state.nodes
      .map(node => {
        return axios(`${node.url}/_internal${request.url}`, {
          validateStatus: status => [200, 404].includes(status)
        });
      })
  );

  if (resourceId) {
    const dataArray = Object.assign(...responses.map(r => r.data));

    if (!responses.find(response => response.status === 200)) {
      writeResponse(404, {}, response);
      return;
    }

    writeResponse(200, dataArray, response);
    return;
  }

  const dataArray = assignDeep(...responses.map(r => r.data));

  const result = Object
    .keys(dataArray)
    .map(key => {
      return {
        id: key,
        ...dataArray[key]
      };
    });

  writeResponse(200, result, response);
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
  const [, collectionId, resourceId] = request.url.split('/');

  if (request.method === 'GET') {
    handleGet(state, request, response, { collectionId, resourceId });
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
