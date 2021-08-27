# Worker standard

1. Workers are created by "worker.js", which for now statically import them using "worker-loader".
2. Workers are launched by the same script and are required to use "comlink" to expose a transferable object to said script. This object needs to meet these requirements:

```js
{
    init: async function (){...}, // A promise that "workers.js" will await for after the worker has exposed the transferable object
    shared: {...} // Memory that will be shared with window.internal for global access. The worker should store all relevant information about it's runtime here.

    // Adding any more values than this is allowed, but not recommended.
    // Exposing too much data to workers.js should also be avoided,
    // as this adds considerable overhead.
}
```

3. Workers should implement a messaging API for communicating with the main thread (of workers.js). Workers are required to follow this standard in messages sent to workers.js via the workers "comport":

```js
{ 
    type: "<command/task name>",
    content: {...} | "...", // Any data to be passed to the command/task.
    id: "<uuid>" // UUIDv4 that will be sent back to the worker in the execution confirmation message
}
```

Workers will be required to support these messages in their API:

- "callback", Execution confirmation message, which will include the command/task id

The workers.js script will implement these commands in it's API for workers to use:

- "callback", Worker command/task execution message, which will include the command/task id
- "error", Logs an error to the console as the main thread
- "log", Logs a message to the console as the main thread
- "confirm", Send a confirm dialog to the user