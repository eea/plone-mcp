# Plan: `gen-agentsmd.py` Script for `AGENTS.md` Generation

## Objective

Create a Python utility script named `gen-agentsmd.py` to automate the generation of an `AGENTS.md` file. This script will read a primary markdown file, identify specific placeholders, and embed the content of referenced local files into the output `AGENTS.md`, along with attribution comments.

## Script Details (`scripts/gen-agentsmd.py`)

### Input

*   **`--input` (or `-i`)**: Path to the primary markdown file (e.g., `GEMINI.md`) containing the placeholders. (Required)
*   **`--output` (or `-o`)**: Path to the output markdown file. Defaults to `AGENTS.md` in the current working directory. (Optional)

### Placeholder Format

The script will look for lines in the input markdown file that match the following pattern:

```
@.<path/to/local/file.md>
```

Example:
`@../../home/tibi/.gemini/AGENTS.md`
`@./README.md`
`@./TESTING.md`

The path should be relative to the directory containing the *input markdown file* or an absolute path.

### Embedding Logic

1.  When a placeholder line `@.<path/to/file.md>` is encountered, the script will:
    *   Extract the `path/to/file.md`.
    *   Read the content of the referenced file.
    *   If the file exists and is readable, its content will be inserted into the output.
    *   The inserted content will be prefixed with `<!-- Imported from: <path/to/file.md> -->` and suffixed with `<!-- End of import from: <path/to/file.md> -->`.
    *   If the referenced file does not exist or is unreadable, an error message will be printed to stderr, and the placeholder line will be kept in the output, optionally with a warning comment. For this project, we'll keep the placeholder and add a warning comment indicating the file was not found.

### Error Handling

*   If the input file does not exist, the script should exit with an error.
*   If a referenced file cannot be found or read, a warning will be issued, and the placeholder line will remain in the output, surrounded by an error comment.

## Makefile Integration

A new target `gen-agents-md` will be added to the `Makefile`.

### Usage

```bash
make gen-agents-md INPUT_FILE=GEMINI.md OUTPUT_FILE=AGENTS.md
```

*   `INPUT_FILE`: Specifies the primary markdown file. (Required)
*   `OUTPUT_FILE`: Specifies the output file name. Defaults to `AGENTS.md`. (Optional)

### Example `Makefile` entry:

```makefile
gen-agents-md:
	@echo "Generating $(OUTPUT_FILE)..."
	@mkdir -p scripts # Ensure scripts directory exists
	@python scripts/gen-agentsmd.py --input $(INPUT_FILE) --output $(OUTPUT_FILE)
```

## Implementation Steps

1.  Create the `scripts/` directory if it doesn't exist.
2.  Write the Python script `scripts/gen-agentsmd.py` based on the above logic.
3.  Add the `gen-agents-md` target to the `Makefile`.
4.  Test the functionality.
