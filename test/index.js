const test = require('tape-catch');
const httpRequest = require('./helpers/httpRequest');

const createTestCluster = require('./helpers/createTestCluster');
const canhazdb = require('../');

test('create one node', async t => {
  t.plan(1);

  const node = await canhazdb({ host: 'localhost', port: 8061 });

  const request = await httpRequest('http://localhost:8061/test');

  node.close();

  t.equal(request.status, 404);
});

test('create two node', async t => {
  t.plan(3);

  const [node1, node2] = await Promise.all([
    canhazdb({ host: 'localhost', port: 8061 }),
    canhazdb({ host: 'localhost', port: 8062 })
  ]);

  await Promise.all([
    node1.join('http://localhost:8062'),
    node2.join('http://localhost:8061')
  ]);

  const request = await httpRequest('http://localhost:8061/test');

  node1.close();
  node2.close();

  t.equal(node1.state.nodes.length, 2);
  t.equal(node2.state.nodes.length, 2);
  t.equal(request.status, 404);
});

test('post: and get some data', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3);
  const node = cluster.getRandomNodeUrl();

  const postRequest = await httpRequest(`${node.url}/test`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${node.url}/test`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {
    a: 1,
    b: 2,
    c: 3
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('post: and get some data - 404 on another node', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/test`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/testUnfound`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {});

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 404);
});

test('post: removing old fields', async t => {
  t.plan(3);

  const cluster = await createTestCluster(3);

  await httpRequest(`${cluster.nodes[1].url}/test`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/test`, {
    method: 'POST',
    data: {
      d: 4
    }
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/test`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {
    d: 4
  });

  t.equal(postRequest.status, 201);
  t.equal(getRequest.status, 200);
});

test('delete: record returns a 404', async t => {
  t.plan(4);

  const cluster = await createTestCluster(3);

  const postRequest = await httpRequest(`${cluster.nodes[1].url}/test`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const deleteRequest = await httpRequest(`${cluster.nodes[1].url}/test`, {
    method: 'DELETE'
  });

  const getRequest = await httpRequest(`${cluster.nodes[2].url}/test`);

  cluster.closeAll();

  t.deepEqual(getRequest.data, {});

  t.equal(postRequest.status, 201);
  t.equal(deleteRequest.status, 200);
  t.equal(getRequest.status, 404);
});
