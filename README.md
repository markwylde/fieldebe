# canhazdb
[![Build Status](https://travis-ci.org/markwylde/canhazdb.svg?branch=master)](https://travis-ci.org/markwylde/canhazdb)
[![David DM](https://david-dm.org/markwylde/canhazdb.svg)](https://david-dm.org/markwylde/canhazdb)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/markwylde/canhazdb)
[![GitHub package.json version](https://img.shields.io/github/package-json/v/markwylde/canhazdb)](https://github.com/markwylde/canhazdb/blob/master/package.json)
[![GitHub](https://img.shields.io/github/license/markwylde/canhazdb)](https://github.com/markwylde/canhazdb/blob/master/LICENSE)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)

A sharded and clustered database communicated over http rest.

## Getting Started
```javascript
const axios = require('axios');
const canhazdb = require('canhazdb');

async function main () {
  const node1 = await canhazdb({ host: 'localhost', port: 8061 })
  const node2 = await canhazdb({ host: 'localhost', port: 8062 })

  await node1.join('http://localhost:8062')
  await node2.join('http://localhost:8061')

  const postRequest = await axios(`${node1.url}/tests`, {
    method: 'POST',
    data: {
      a: 1,
      b: 2,
      c: 3
    }
  });

  const result = await axios(`${node2.url}/tests/${postRequest.data.id}`);

  console.log(result.data);

  /*
    {
      b: 2,
      a: 1,
      c: 3
    }
  */
}
```

## Endpoints

<table>
  <tr>
    <th></th>
    <th>Method</th>
    <th>Path</th>
    <th>Description</th>
  </tr>
  <tr>
    <td colspan=4>
      <strong>External</strong></br>
      These requests will collect results from all known nodes.
    </td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.1</a></td>
    <td>GET</td>
    <td>/:collectionId</td>
    <td>List all documents for a collection</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.1</a></td>
    <td>GET</td>
    <td>/:collectionId?query={"a":1}</td>
    <td>List all documents partially matching query</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.1</a></td>
    <td>GET</td>
    <td>/:collectionId/:documentId</td>
    <td>Get all fields for a document</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.2</a></td>
    <td>POST</td>
    <td>/:collectionId/:documentId</td>
    <td>Remove then set all fields on a document</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.2</a></td>
    <td>PATCH</td>
    <td>/:collectionId/:documentId</td>
    <td>Set fields on a document</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">1.3</a></td>
    <td>DELETE</td>
    <td>/:collectionId/:documentId</td>
    <td>Delete all fields for a document</td>
  </tr>
  <tr>
    <td colspan=4>
      <strong>Internal</strong></br>
      These requests are scoped only to the data within that node.
    </td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">2.1</a></td>
    <td>GET</td>
    <td>/_info</td>
    <td>Get stats and version info for the node</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">2.2</a></td>
    <td>GET</td>
    <td>/_internal/:collectionId/:documentId</td>
    <td>Get fields for a document</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">2.3</a></td>
    <td>POST</td>
    <td>/_internal/:collectionId/:documentId</td>
    <td>Replace all fields to a document</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">2.3</a></td>
    <td>PATCH</td>
    <td>/_internal/:collectionId/:documentId</td>
    <td>Replace fields to a document</td>
  </tr>
  <tr>
    <td><a href="https://www.github.com/markwylde/canhazdb">2.4</a></td>
    <td>DELETE</td>
    <td>/_internal/:collectionId/:documentId</td>
    <td>Delete fields to a document</td>
  </tr>
</table>

## License
This project is licensed under the terms of the AGPL-3.0 license.