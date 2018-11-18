/* global fetch, setTimeout */
import {Table} from 'apache-arrow/Arrow.es5.min.js';

/* Simulates incremental loading */
export function loadFromFile(path, onUpdate) {
  fetch(path)
    .then(resp => resp.arrayBuffer())
    .then(arraybuffer => {
      const buffer = new Uint8Array(arraybuffer);
      const table = Table.from(buffer);
      // console.log(table.toString());

      return new Promise(resolve => {
        // Send a batch every 50ms
        iterateAsync(
          table.batches,
          batch => {
            const values = {
              metadata: batch.schema.metadata,
              length: batch.length
            };
            batch.schema.fields.forEach(({name}, index) => {
              values[name] = batch.getChildAt(index).toArray();
            });
            onUpdate(values);
          },
          resolve,
          50
        );
      });
    });
}

function iterateAsync(array, onResult, onDone, delay, index = 0) {
  if (index >= array.length) {
    onDone();
    return;
  }
  onResult(array[index], index);

  setTimeout(() => {
    iterateAsync(array, onResult, onDone, delay, index + 1);
  }, delay);
}
