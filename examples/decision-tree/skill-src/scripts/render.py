#!/usr/bin/env python3
"""Render the widget template by substituting JSON data via Mustache.

Usage: pipe JSON payload to stdin, e.g.:
    echo '<json-payload>' | python3 render.py
    cat payload.json | python3 render.py

Stdin is used (not argv) so multi-paragraph prose values do not have to
fight shell quoting.

Exit codes: 0 success, 1 invalid JSON or schema violation.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE / "_vendor"))
import chevron

SKILL_DIR = HERE.parent  # skill/<name>/
TEMPLATE = SKILL_DIR / "assets" / "widget-bundled.html"
SCHEMA = SKILL_DIR / "assets" / "schema.json"


def fail(message):
    print(f"render.py: {message}", file=sys.stderr)
    sys.exit(1)


def check_type(value, expected_type, location):
    type_map = {
        "string": str,
        "object": dict,
        "array": list,
        "number": (int, float),
        "boolean": bool,
        "null": type(None),
    }
    expected = type_map.get(expected_type)
    if expected is None:
        return
    if not isinstance(value, expected):
        fail(f"{location}: expected {expected_type}, got {type(value).__name__}")


def validate(data, schema, location="root"):
    # Minimal JSON Schema validation: required, type, additionalProperties, enum.
    expected_type = schema.get("type")
    if expected_type:
        check_type(data, expected_type, location)

    if expected_type == "object" and isinstance(data, dict):
        required = schema.get("required", [])
        for key in required:
            if key not in data:
                fail(f"{location}: missing required property '{key}'")

        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for key in data:
                if key not in properties:
                    fail(f"{location}: unexpected property '{key}'")

        for key, value in data.items():
            sub_schema = properties.get(key)
            if sub_schema:
                validate(value, sub_schema, f"{location}.{key}")

    if expected_type == "array" and isinstance(data, list):
        item_schema = schema.get("items")
        if item_schema:
            for index, item in enumerate(data):
                validate(item, item_schema, f"{location}[{index}]")

    enum = schema.get("enum")
    if enum is not None and data not in enum:
        fail(f"{location}: value not in enum {enum}")


def validate_tree_depth(tree):
    """Walk the tree and enforce: every L0 has 2-4 L1 children; every L1 has
    2-4 L2 children; L2 nodes are terminal. The skill contract requires
    exactly 3 levels - ragged trees and 2-level trees are not valid.
    """
    l0_branches = tree.get("branches") or []
    if not l0_branches:
        fail("tree.branches: must contain 2-4 L0 branches")
    for l0_index, l0_branch in enumerate(l0_branches):
        title = l0_branch.get("title", "?")
        l0_sub = l0_branch.get("sub")
        if not l0_sub or not isinstance(l0_sub, dict):
            fail(
                f"tree.branches[{l0_index}] ({title}): L0 branches must have a non-null 'sub' "
                f"with 2-4 L1 children. The skill requires exactly 3 levels deep - "
                f"L0 nodes cannot be terminal."
            )
        l1_branches = l0_sub.get("branches") or []
        if not (2 <= len(l1_branches) <= 4):
            fail(
                f"tree.branches[{l0_index}].sub.branches ({title}): must contain 2-4 L1 children, "
                f"got {len(l1_branches)}"
            )
        for l1_index, l1_branch in enumerate(l1_branches):
            l1_title = l1_branch.get("title", "?")
            l1_sub = l1_branch.get("sub")
            if not l1_sub or not isinstance(l1_sub, dict):
                fail(
                    f"tree.branches[{l0_index}].sub.branches[{l1_index}] ({l1_title}): "
                    f"L1 branches must have a non-null 'sub' with 2-4 L2 children. "
                    f"The skill requires exactly 3 levels deep - L1 nodes cannot be terminal."
                )
            l2_branches = l1_sub.get("branches") or []
            if not (2 <= len(l2_branches) <= 4):
                fail(
                    f"tree.branches[{l0_index}].sub.branches[{l1_index}].sub.branches "
                    f"({l1_title}): must contain 2-4 L2 children, got {len(l2_branches)}"
                )
            for l2_index, l2_branch in enumerate(l2_branches):
                l2_title = l2_branch.get("title", "?")
                l2_sub = l2_branch.get("sub")
                if l2_sub and isinstance(l2_sub, dict) and l2_sub.get("branches"):
                    fail(
                        f"tree.branches[{l0_index}].sub.branches[{l1_index}].sub.branches"
                        f"[{l2_index}] ({l2_title}): L2 leaves must be terminal (sub: null). "
                        f"The skill requires exactly 3 levels deep, no deeper."
                    )


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        fail("usage: pipe a JSON payload to render.py via stdin")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        fail(f"invalid JSON: {error}")

    schema = json.loads(SCHEMA.read_text())
    validate(data, schema)
    validate_tree_depth(data["tree"])

    json_variants = {
        f"{key}_json": json.dumps(value)
        for key, value in data.items()
        if not key.endswith("_json")
    }
    template_data = {**data, **json_variants}

    template = TEMPLATE.read_text()
    sys.stdout.write(chevron.render(template, template_data))


if __name__ == "__main__":
    main()
