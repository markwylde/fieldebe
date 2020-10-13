const packageJson = require('./package.json');

const writeResponse = require('write-response');
const finalStream = require('final-stream');

const partiallyMatchObject = require('./utils/partiallyMatchObject');

function handleGetOne (state, request, response, { collectionId, resourceId }) {
  const data = state.data[collectionId] && state.data[collectionId][resourceId];

  if (!data) {
    writeResponse(404, {}, response);
    return;
  }

  writeResponse(200, data, response);
}

function handleGetAll (state, request, response, { collectionId, resourceId, url }) {
  const data = state.data[collectionId] || {};

  const query = url.searchParams.get('query') && JSON.parse(url.searchParams.get('query'));
  const ids = url.searchParams.get('ids') && url.searchParams.get('ids').split(',');

  const filtered = Object
    .keys(data)
    .filter(key => {
      if (ids) {
        return ids.includes(key);
      }

      return query ? partiallyMatchObject(data[key], query) : true;
    })
    .map(key => {
      return {
        id: key,
        ...data[key]
      };
    });

  writeResponse(200, filtered, response);
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
  const url = new URL(request.url, 'http://localhost');

  if (request.url === '/_info') {
    writeResponse(200, {
      version: packageJson.version
    }, response);
    response.end();
    return;
  }

  const resourceUrl = url.pathname.substr('/_internal'.length);
  const [, collectionId, resourceId] = resourceUrl.split('/');

  if (request.method === 'GET' && resourceId) {
    handleGetOne(state, request, response, { collectionId, resourceId });
    return;
  }

  if (request.method === 'GET' && !resourceId) {
    handleGetAll(state, request, response, { collectionId, resourceId, url });
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
