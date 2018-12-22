/* global window, fetch, ReadableStream */

// Polyfill ReadableStream for FireFox
if (typeof ReadableStream === 'undefined') {
  const mozFetch = require('fetch-readablestream');
  const streams = require('@mattiasbuelens/web-streams-polyfill');
  const {createReadableStreamWrapper} = require('@mattiasbuelens/web-streams-adapter');
  const toPolyfilledReadableStream = createReadableStreamWrapper(streams.ReadableStream);
  window.fetch = async function fetch(...args) {
    const res = await mozFetch(...args);
    res.body = toPolyfilledReadableStream(res.body);
    res.bodyUsed = false;
    return res;
  };
}

import {RecordBatchReader} from 'apache-arrow/Arrow.es5.min.js';

export function loadFromFile(path, onUpdate) {
  RecordBatchReader.from(fetch(path, {credentials: 'omit'}))
    // This isn't strictly necessary at the moment, but depending on usage
    // patterns and feedback we may change Arrow not to auto-open the
    // RecordBatchReader, so being explicit here is safe
    .then(reader => reader.open())
    .then(loadBatch)
    .then(reader => reader.cancel());

  function loadBatch(reader) {
    return reader.next().then(result => {
      if (!result.done) {
        yieldBatch(result.value);
        return loadBatch(reader);
      }
      return reader;
    });
  }

  function yieldBatch(batch) {
    const values = {
      metadata: batch.schema.metadata,
      length: batch.length
    };
    batch.schema.fields.forEach(({name}, index) => {
      values[name] = batch.getChildAt(index).toArray();
    });
    onUpdate(values);
  }
}
