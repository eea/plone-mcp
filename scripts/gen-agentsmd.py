import argparse
import os
import re

def generate_agents_md(input_file_path, output_file_path):
    """
    Generates AGENTS.md by inserting content from referenced files.
    """
    try:
        with open(input_file_path, 'r', encoding='utf-8') as f_in:
            input_content = f_in.readlines()
    except FileNotFoundError:
        print(f"Error: Input file '{input_file_path}' not found.", file=os.sys.stderr)
        return
    except Exception as e:
        print(f"Error reading input file '{input_file_path}': {e}", file=os.sys.stderr)
        return

    output_lines = []
    input_dir = os.path.dirname(input_file_path)

    for line in input_content:
        match = re.match(r'^@(.*)$', line.strip())
        if match:
            referenced_file_path = match.group(1).strip()
            
            # Resolve absolute path for referenced file
            if not os.path.isabs(referenced_file_path):
                # If the input_file_path is just a filename (e.g., "GEMINI.md"),
                # then input_dir would be empty. In that case, use current working directory.
                if input_dir:
                    full_referenced_path = os.path.join(input_dir, referenced_file_path)
                else:
                    full_referenced_path = os.path.join(os.getcwd(), referenced_file_path)
            else:
                full_referenced_path = referenced_file_path

            # Normalize path to ensure consistency
            full_referenced_path = os.path.normpath(full_referenced_path)

            # Determine the path to use in the import comment (always relative to CWD)
            path_for_comment = os.path.relpath(full_referenced_path, os.getcwd())

            # Check if the file is within the current project directory
            if not full_referenced_path.startswith(os.getcwd() + os.sep) and not full_referenced_path == os.getcwd():
                print(f"Warning: Referenced file '{full_referenced_path}' is outside the current project directory. Ignoring its content.", file=os.sys.stderr)
                output_lines.append(line)
                output_lines.append(f"<!-- Warning: Referenced file '{path_for_comment}' is outside the project and was ignored. -->\n")
                continue # Skip to the next line in the input content

            try:
                with open(full_referenced_path, 'r', encoding='utf-8') as f_ref:
                    output_lines.append(f"<!-- Imported from: {path_for_comment} -->\n")
                    output_lines.extend(f_ref.readlines())
                    output_lines.append(f"<!-- End of import from: {path_for_comment} -->\n")
            except FileNotFoundError:
                print(f"Warning: Referenced file '{full_referenced_path}' not found. Keeping placeholder.", file=os.sys.stderr)
                output_lines.append(line)
                output_lines.append(f"<!-- Warning: Referenced file '{relative_referenced_path_for_comment}' not found during AGENTS.md generation. -->\n")
            except Exception as e:
                print(f"Warning: Error reading referenced file '{full_referenced_path}': {e}. Keeping placeholder.", file=os.sys.stderr)
                output_lines.append(line)
                output_lines.append(f"<!-- Warning: Error reading referenced file '{relative_referenced_path_for_comment}': {e} during AGENTS.md generation. -->\n")
        else:
            output_lines.append(line)

    try:
        with open(output_file_path, 'w', encoding='utf-8') as f_out:
            f_out.writelines(output_lines)
        print(f"Successfully generated '{output_file_path}' from '{input_file_path}'.")
    except Exception as e:
        print(f"Error writing to output file '{output_file_path}': {e}", file=os.sys.stderr)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate AGENTS.md by embedding content from referenced files.")
    parser.add_argument("-i", "--input", required=True,
                        help="Path to the primary markdown file (e.g., GEMINI.md) containing placeholders.")
    parser.add_argument("-o", "--output", default="AGENTS.md",
                        help="Path to the output markdown file. Defaults to 'AGENTS.md'.")
    args = parser.parse_args()

    generate_agents_md(args.input, args.output)
