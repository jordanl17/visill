---
name: hello
description: A minimal fixture skill for @visill/build tests.
---

# Hello

## Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "hello",
  "type": "object",
  "properties": {
    "message": {
      "type": "string"
    }
  },
  "required": [
    "message"
  ]
}
```
