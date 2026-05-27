#!/usr/bin/env python3
"""Canonical stdin renderer for visill widget skills: reads a JSON payload,
validates it against the sibling schema.json, then renders template.mustache via vendored chevron."""

import json
import sys
from pathlib import Path

if sys.version_info < (3, 10):
    actual_version = '.'.join(str(part) for part in sys.version_info[:3])
    print(
        f"render.py: requires Python 3.10+, got {actual_version}",
        file=sys.stderr,
    )
    sys.exit(1)

HERE = Path(__file__).parent
# Prepend so the vendored chevron wins over any host-installed copy.
sys.path.insert(0, str(HERE / '_vendor'))
import chevron

SCHEMA_PATH = HERE / 'schema.json'
TEMPLATE_PATH = HERE / 'template.mustache'

JSON_TYPE_MAP = {
    'string': str,
    'object': dict,
    'array': list,
    'number': (int, float),
    'boolean': bool,
    'null': type(None),
}


def fail(message):
    print(f"render.py: {message}", file=sys.stderr)
    sys.exit(1)


def check_type(value, expected, path):
    python_type = JSON_TYPE_MAP.get(expected)
    if python_type is None:
        return
    if isinstance(value, python_type):
        return
    fail(f"{path}: expected {expected}, got {type(value).__name__}")


def validate(payload, schema, path='root'):
    expected_type = schema.get('type')
    if expected_type:
        check_type(payload, expected_type, path)

    if expected_type == 'object' and isinstance(payload, dict):
        required = schema.get('required', [])
        for key in required:
            if key not in payload:
                fail(f"{path}: missing required property '{key}'")

        properties = schema.get('properties', {})
        if schema.get('additionalProperties') is False:
            for key in payload:
                if key not in properties:
                    fail(f"{path}: unexpected property '{key}'")

        for key, value in payload.items():
            sub_schema = properties.get(key)
            if sub_schema:
                validate(value, sub_schema, f"{path}.{key}")

    if expected_type == 'array' and isinstance(payload, list):
        min_items = schema.get('minItems')
        if isinstance(min_items, int) and len(payload) < min_items:
            fail(f"{path}: expected at least {min_items} item(s), got {len(payload)}")
        item_schema = schema.get('items')
        if item_schema:
            for index, item in enumerate(payload):
                validate(item, item_schema, f"{path}[{index}]")

    enum = schema.get('enum')
    if enum is not None and payload not in enum:
        fail(f"{path}: value not in enum {enum}")


def encode_for_script_tag(value):
    # Replace `</` so user content containing `</script>` cannot prematurely
    # close the embedding <script type="application/json"> block; JSON's `\/`
    # escape round-trips through JSON.parse() in the widget.
    return json.dumps(value, ensure_ascii=False).replace('</', '<\\/')


def with_json_siblings(data):
    if isinstance(data, dict):
        enriched = {
            key: with_json_siblings(value) if isinstance(value, dict) else value
            for key, value in data.items()
        }
        for key, value in data.items():
            if key.endswith('_json'):
                continue
            enriched[f"{key}_json"] = encode_for_script_tag(value)
        return enriched
    return data


def main():
    raw = sys.stdin.read()
    if raw.strip() == '':
        print('usage: cat payload.json | render.py', file=sys.stderr)
        sys.exit(1)

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as decode_error:
        fail(f"invalid JSON: {decode_error}")

    schema = json.loads(SCHEMA_PATH.read_text())
    validate(payload, schema)

    template = TEMPLATE_PATH.read_text()
    enriched = with_json_siblings(payload)
    sys.stdout.write(chevron.render(template, enriched))


if __name__ == '__main__':
    main()
