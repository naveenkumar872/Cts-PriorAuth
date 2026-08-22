import os
import json
import asyncio
import random
from pathlib import Path

from kreuzberg import extract_file
from google import genai


# ============================================================
# CONFIGURATION
# ============================================================

INPUT_FOLDER = Path("./policies")
OUTPUT_FOLDER = Path("./rulesets")

# Set your Gemini API key as an environment variable:
# Windows PowerShell:
# $env:GEMINI_API_KEY="your_api_key_here"
#
# Windows CMD:
# set GEMINI_API_KEY=your_api_key_here

GEMINI_API_KEY =""

GEMINI_MODEL = "gemini-3.5-flash"


# ============================================================
# GEMINI CLIENT
# ============================================================

if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY environment variable is not set."
    )

client = genai.Client(api_key=GEMINI_API_KEY)


# ============================================================
# GEMINI PROMPT
# ============================================================

SYSTEM_PROMPT = r"""
You are a healthcare insurance policy rules extraction system.

Your task is to analyze the provided policy document text and convert
the policy requirements into ONE structured JSON ruleset.

IMPORTANT RULES:

1. Use ONLY information explicitly present in the policy document.

2. DO NOT invent, assume, infer, or add:
   - Medical rules
   - Service codes
   - CPT codes
   - HCPCS codes
   - ICD codes
   - Diagnosis codes
   - Numerical values
   - Age limits
   - BMI thresholds
   - Laboratory thresholds
   - Treatment durations
   - Number of sessions
   - Quantity limits
   - Frequency limits
   - Clinical conditions
   - Medical necessity requirements
   - Exclusions
   - Exceptions
   - Coverage limitations

3. Preserve numerical requirements EXACTLY as stated
   in the policy document.

4. Extract all applicable information explicitly present
   in the document, including:

   - CPT codes
   - HCPCS codes
   - ICD codes
   - Service names
   - Service types
   - Clinical conditions
   - Medical necessity requirements
   - Prior treatment requirements
   - Documentation requirements
   - Exclusions
   - Exceptions
   - Coverage limitations
   - Numerical criteria
   - Time periods
   - Frequency requirements
   - Quantity requirements

5. If a category is not present in the policy,
   DO NOT invent data for it.

6. Do not use general medical knowledge.

7. Do not use information from outside the supplied document.

8. If the document references another policy, guideline,
   NCD, LCD, MCG guideline, or external document but does
   not provide its actual criteria, DO NOT invent those criteria.

9. Background information, historical information,
   research evidence, or descriptive information must NOT
   automatically be converted into coverage rules.

10. Only convert statements into rules when the policy explicitly
    presents them as requirements, exclusions, limitations,
    exceptions, or applicable coverage criteria.

11. DO NOT include workflow decisions such as:

    APPROVE
    REJECT
    DENY
    MORE_INFORMATION
    NURSE_REVIEW

    The ruleset should only describe what the policy requires
    or excludes.

12. A separate Decision Engine will later evaluate these rules.

13. Return ONLY valid JSON.

14. Do not wrap the JSON inside markdown code fences.

Use this structure:

{
  "policy_id": "...",
  "policy_name": "...",

  "rule_sets": [
    {
      "rule_set_id": "...",

      "match_criteria": {
        "service_code": {
          "coding_system": "...",
          "operator": "IN",
          "value": []
        }
      },

      "pathways": [
        {
          "pathway_id": "...",
          "logic": "ALL",

          "conditions": [
            {
              "field": "...",
              "operator": ">=",
              "value": 3,
              "unit": "weeks"
            }
          ]
        }
      ],

      "exclusions": []
    }
  ]
}

IMPORTANT:

The example values are ONLY examples of the schema.

Do NOT copy:

- "..."
- 3
- "weeks"
- "IN"
- Any example medical rule

unless the same information is explicitly present
in the supplied policy.

If a service code is not present, do not create one.

If a CPT code is present, preserve it exactly.

If a HCPCS code is present, preserve it exactly.

If an ICD code is present, preserve it exactly.

If a numerical rule is present, preserve its exact
value and unit.

Do not lose important policy information merely because
the example schema does not explicitly show a particular field.

You may add fields inside the JSON structure when necessary
to represent information explicitly present in the policy.

However, EVERY extracted value must be directly supported
by the supplied policy text.
"""


# ============================================================
# KREUZBERG PDF EXTRACTION
# ============================================================

async def extract_text_from_pdf(pdf_path: Path) -> str:
    """
    Extract text from a PDF using Kreuzberg.
    No Tesseract is used.
    """

    result = await extract_file(
        str(pdf_path)
    )

    # Kreuzberg returns an extraction result.
    # The extracted text is available through .content.
    text = result.content

    if not text or not text.strip():
        raise ValueError(
            f"No text could be extracted from {pdf_path.name}"
        )

    return text.strip()


# ============================================================
# GEMINI EXTRACTION
# ============================================================

def extract_ruleset_with_gemini(
    policy_text: str,
    filename: str
):

    prompt = f"""
{SYSTEM_PROMPT}

============================================================
POLICY DOCUMENT
============================================================

Filename:
{filename}

============================================================
EXTRACTED POLICY TEXT
============================================================

{policy_text}

============================================================

Now extract the structured policy ruleset.

Remember:

- Use ONLY the supplied policy text.
- Do NOT invent information.
- Do NOT use external medical knowledge.
- Do NOT infer missing criteria.
- Preserve all explicit CPT codes.
- Preserve all explicit HCPCS codes.
- Preserve all explicit ICD codes.
- Preserve all numerical values exactly.
- Preserve explicit exclusions.
- Preserve explicit exceptions.
- Preserve explicit documentation requirements.
- Preserve coverage limitations.
- Do not convert background information into rules.
- Do not generate workflow decisions.

Return ONLY valid JSON.
"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "temperature": 0,
            "response_mime_type": "application/json"
        }
    )

    return response.text


# ============================================================
# VALIDATE JSON
# ============================================================

def validate_ruleset(json_text: str):

    try:
        ruleset = json.loads(json_text)

    except json.JSONDecodeError as e:

        print("Gemini returned invalid JSON.")
        print(e)

        return None

    required_fields = [
        "policy_id",
        "policy_name",
        "rule_sets"
    ]

    for field in required_fields:

        if field not in ruleset:

            raise ValueError(
                f"Missing required field: {field}"
            )

    if not isinstance(
        ruleset["rule_sets"],
        list
    ):

        raise ValueError(
            "'rule_sets' must be a list."
        )

    return ruleset


# ============================================================
# PROCESS ONE PDF
# ============================================================

async def process_pdf(pdf_path: Path):

    print("\n" + "=" * 70)
    print(f"Processing: {pdf_path.name}")
    print("=" * 70)

    # --------------------------------------------------------
    # 1. Extract text using Kreuzberg
    # --------------------------------------------------------

    print("Extracting text using Kreuzberg...")

    try:

        policy_text = await extract_text_from_pdf(
            pdf_path
        )

    except Exception as e:

        print(
            f"Kreuzberg extraction failed: {e}"
        )

        return False

    print(
        f"Extracted {len(policy_text):,} characters."
    )

    # --------------------------------------------------------
    # 2. Send extracted text to Gemini
    # --------------------------------------------------------

    print("Sending policy to Gemini...")

    try:

        json_text = extract_ruleset_with_gemini(
            policy_text,
            pdf_path.name
        )

    except Exception as e:

        print(
            f"Gemini error: {e}"
        )

        return False

    # --------------------------------------------------------
    # 3. Validate Gemini JSON
    # --------------------------------------------------------

    print("Validating JSON...")

    try:

        ruleset = validate_ruleset(
            json_text
        )

    except Exception as e:

        print(
            f"JSON validation failed: {e}"
        )

        return False

    if ruleset is None:
        return False

    # --------------------------------------------------------
    # 4. Save JSON
    # --------------------------------------------------------

    output_filename = (
        pdf_path.stem +
        "_ruleset.json"
    )

    output_path = (
        OUTPUT_FOLDER /
        output_filename
    )

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            ruleset,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        f"Saved: {output_path}"
    )

    return True


# ============================================================
# PROCESS ALL PDF FILES
# ============================================================

async def process_all_pdfs():

    # Create output directory
    OUTPUT_FOLDER.mkdir(
        parents=True,
        exist_ok=True
    )

    if not INPUT_FOLDER.exists():

        raise FileNotFoundError(
            f"Input folder not found: {INPUT_FOLDER}"
        )

    # Get all PDFs
    pdf_files = sorted(
        INPUT_FOLDER.glob("*.pdf")
    )

    if not pdf_files:

        print(
            f"No PDF files found in {INPUT_FOLDER}"
        )

        return

    print(
        f"Found {len(pdf_files)} PDF files."
    )

    successful = 0
    failed = 0

    # --------------------------------------------------------
    # Process one PDF at a time
    # --------------------------------------------------------

    for index, pdf_path in enumerate(pdf_files):

        try:

            success = await process_pdf(
                pdf_path
            )

            if success:
                successful += 1
            else:
                failed += 1

        except Exception as e:

            print(
                f"Unexpected error for "
                f"{pdf_path.name}: {e}"
            )

            failed += 1

        # ----------------------------------------------------
        # WAIT 20–30 SECONDS BEFORE NEXT PDF
        # ----------------------------------------------------

        # Do not wait after the final PDF
        if index < len(pdf_files) - 1:

            wait_time = random.randint(
                20,
                30
            )

            print("\n" + "-" * 70)
            print(
                f"Waiting {wait_time} seconds "
                f"before processing the next PDF..."
            )
            print("-" * 70)

            await asyncio.sleep(
                wait_time
            )


    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n" + "=" * 70)
    print("PROCESSING COMPLETE")
    print("=" * 70)

    print(
        f"Total PDFs : {len(pdf_files)}"
    )

    print(
        f"Successful : {successful}"
    )

    print(
        f"Failed     : {failed}"
    )

    print(
        f"Output folder: {OUTPUT_FOLDER}"
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    asyncio.run(
        process_all_pdfs()
    )