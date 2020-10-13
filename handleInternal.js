const packageJson = require('./package.json');

const writeResponse = require('write-response');
const finalStream = require('final-stream');

function handleGet (state, request, response, { collectionId, resourceId }) {
  if (!resourceId) {
    const data = state.data[collectionId];
    writeResponse(200, data, response);
    return;
  }

  const data = state.data[collectionId] && state.data[collectionId][resourceId];

  if (!data) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, data, response);
}

async function handlePut (state, request, response, { collectionId, resourceId }) {
  const body = await finalStream(request).then(JSON.parse);

  state.data[collectionId] = state.data[collectionId] || {};
  state.data[collectionId][resourceId] = state.data[collectionId][resourceId] || {};

  Object.assign(state.data[collectionId][resourceId], body);

  writeResponse(200, {}, response);
}

async function handleDelete (state, request, response, { collectionId, resourceId }) {
  if (state.data[collectionId]) {
    delete state.data[collectionId][resourceId];
  }

  writeResponse(200, {}, response);
}

async function handleInternal (state, request, response) {
  if (request.url === '/_info') {
    writeResponse(200, {
      version: packageJson.version
    }, response);
    response.end();
    return;
  }

  const resourceUrl = request.url.substr('/_internal'.length);
  const [, collectionId, resourceId] = resourceUrl.split('/');

  if (request.method === 'GET') {
    handleGet(state, request, response, { collectionId, resourceId });
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

  writeResponse(404, {}, response);
}

module.exports = handleInternal;
