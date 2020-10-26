# Travelport eStreaming Pipe Consumer

Please check [product presentation](https://docs.google.com/presentation/d/1lZ23vQBUSnyJfxpbjfqPseImeDNVTNWnoJmf5C22hZU/edit?usp=sharing).

Given example is created to illustrate how to process Travelport Pipe.

It includes:

1. Server, which could be run on multi-CPU servers
1. Request and response error handling and logging
1. Early response to the Travelport Pipe servers
1. Collecting request chunks
1. Request processing example, which simply extracts data using brotli decompression
