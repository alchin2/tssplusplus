import re
from dataclasses import dataclass
from typing import List, Union

# Course pattern
COURSE_RE = re.compile(r"^([A-Z]{2,6})\s*-?\s*(\d{1,3}[A-Z]{0,2})$")


@dataclass
class Course:
    code: str

@dataclass
class OrExpr:
    items: List[Course]

@dataclass
class AndExpr:
    items: List[Union[Course, OrExpr]]


def looks_like_course(text: str) -> bool:
    return bool(COURSE_RE.match(text.replace(" ", "")))


def extract_dept(text: str) -> str | None:
    """Extract department from a course code."""
    match = COURSE_RE.match(text.replace(" ", ""))
    if match:
        return match.group(1)
    return None


def find_prereq_boundary(raw_str: str) -> str:
    # Split by semicolon - everything after is notes/restrictions
    if ';' in raw_str:
        raw_str = raw_str.split(';')[0]

    return raw_str.strip()


def tokenize(text: str) -> List[str]:
    # Normalize the text
    text = re.sub(r'\s+', ' ', text).strip()

    # Remove Math Placement Exam references (including "qualifying score")
    text = re.sub(r'Math\s+Placement\s+Exam(\s+qualifying)?(\s+score)?(\s+of\s+\d+)?', '', text, flags=re.IGNORECASE)

    # Remove AP exam score clauses (e.g., "AP Calculus BC score of 4 or 5", "AP Calculus AB score (or subscore) of 2")
    text = re.sub(r'AP\s+[A-Za-z\s]+score\s*(\(or\s+subscore\))?\s*of\s+\d+(\s+or\s+\d+)?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\b[A-Z]{2}\s+score\s*(\(or\s+subscore\))?\s*of\s+\d+(\s+or\s+\d+)?', '', text, flags=re.IGNORECASE)

    # Remove grade requirements
    text = re.sub(r'\s+with\s+a\s+grade\s+of\s+[A-Za-z0-9+-–]+(\s+or\s+(above|better))?', '', text, flags=re.IGNORECASE)

    # Remove GPA requirements (e.g., "GPA of 2", "GPA of 2.5 or higher")
    text = re.sub(r'\bGPA\s+of\s+\d+(\.\d+)?(\s+or\s+(higher|above|better))?', '', text, flags=re.IGNORECASE)

    tokens = []
    prev_dept = None

    raw_tokens = text.split()

    i = 0
    while i < len(raw_tokens):
        token = raw_tokens[i].strip(' ,')

        if not token:
            i += 1
            continue

        token_lower = token.lower()

        # Check for AND/OR keywords
        if token_lower == 'and':
            tokens.append('AND')
            i += 1
            continue
        elif token_lower == 'or':
            tokens.append('OR')
            i += 1
            continue

        # Try to combine with next token to form course code (e.g., "CSE" + "12")
        token_upper = token.upper()

        # Check if this is a department code followed by a number
        if re.match(r'^[A-Z]{2,6}$', token_upper) and i + 1 < len(raw_tokens):
            next_token = raw_tokens[i + 1].strip(' ,').upper()
            # Check if next token is a course number or number with range
            if re.match(r'^\d{1,3}[A-Z]{0,2}(-[A-Z0-9]+)*$', next_token):
                # Combine them
                combined = token_upper + next_token
                # Handle ranges like "20A-B-C"
                if '-' in next_token:
                    parts = next_token.split('-')
                    base_num = re.match(r'^(\d{1,3})([A-Z]{0,2})', parts[0])
                    if base_num:
                        # First part is complete
                        first_course = token_upper + parts[0]
                        tokens.append(first_course)
                        prev_dept = token_upper
                        # Rest are letter suffixes
                        for part in parts[1:]:
                            part = part.strip()
                            if re.match(r'^[A-Z]{1,2}$', part):
                                tokens.append(token_upper + base_num.group(1) + part)
                            elif re.match(r'^\d{1,3}[A-Z]{0,2}$', part):
                                tokens.append(token_upper + part)
                else:
                    tokens.append(token_upper + next_token)
                    prev_dept = token_upper
                i += 2
                continue

        # Check if it's already a complete course code
        if looks_like_course(token_upper):
            tokens.append(token_upper)
            prev_dept = extract_dept(token_upper)
            i += 1
            continue

        # Check if it's a number/range that needs department filled in
        if prev_dept:
            # Handle ranges like "31BH" or "4A-B-C-D"
            if '-' in token_upper:
                parts = token_upper.split('-')
                for part in parts:
                    part = part.strip()
                    if not part:
                        continue
                    if re.match(r'^\d{1,3}[A-Z]{0,2}$', part):
                        tokens.append(prev_dept + part)
                    elif re.match(r'^[A-Z]{1,2}$', part) and tokens:
                        # Letter continuation - get base from last token
                        last = tokens[-1]
                        base = re.match(r'^([A-Z]{2,6})(\d{1,3})', last)
                        if base:
                            tokens.append(base.group(1) + base.group(2) + part)
                i += 1
                continue
            elif re.match(r'^\d{1,3}[A-Z]{0,2}$', token_upper):
                tokens.append(prev_dept + token_upper)
                i += 1
                continue

        # Unknown token - skip it
        i += 1

    return tokens


def parse_to_groups(tokens: List[str]) -> Union[Course, OrExpr, AndExpr, None]:
    """
    Builds a strict 2-level tree: a top-level AndExpr whose items are either
    a bare Course or an OrExpr of Courses. OR binds tighter than AND, but no
    deeper nesting (e.g. parentheses) is supported.

    Example: A and B or C and D
    Parses as: A and (B or C) and D -> AndExpr([A, OrExpr([B, C]), D])
    """
    if not tokens:
        return None

    # Filter to only course tokens and operators
    filtered = []
    for t in tokens:
        if t in ('AND', 'OR') or looks_like_course(t):
            filtered.append(t)

    if not filtered:
        return None

    # Remove leading/trailing operators
    while filtered and filtered[0] in ('AND', 'OR'):
        filtered.pop(0)
    while filtered and filtered[-1] in ('AND', 'OR'):
        filtered.pop()

    if not filtered:
        return None

    # First pass: group by OR (higher precedence)
    and_groups = []
    current_or_group = []

    i = 0
    while i < len(filtered):
        token = filtered[i]

        if token == 'AND':
            # Finish current OR group, start new one
            if current_or_group:
                and_groups.append(current_or_group)
                current_or_group = []
        elif token == 'OR':
            # Continue building current OR group
            pass
        else:
            # It's a course
            current_or_group.append(Course(code=token))

        i += 1

    if current_or_group:
        and_groups.append(current_or_group)

    if not and_groups:
        return None

    # Each and_group is a list of courses connected by OR
    and_items = []
    for or_group in and_groups:
        if len(or_group) == 1:
            and_items.append(or_group[0])
        elif len(or_group) > 1:
            and_items.append(OrExpr(items=or_group))

    # Always wrap in AndExpr, even if there's only one item
    return AndExpr(items=and_items)


def ast_to_dict(node: Union[Course, OrExpr, AndExpr, None]) -> dict | None:
    if node is None:
        return None

    if isinstance(node, Course):
        return {
            "type": "COURSE",
            "course_id": node.code
        }
    elif isinstance(node, OrExpr):
        return {
            "type": "OR",
            "items": [ast_to_dict(item) for item in node.items]
        }
    elif isinstance(node, AndExpr):
        return {
            "type": "AND",
            "items": [ast_to_dict(item) for item in node.items]
        }
    return None


def build_prereq_tree(raw_prereq: str) -> dict | None:
    """
    Parse a single raw prerequisite string into a 2-level AND/OR tree (dict
    form), or None if there are no prerequisites / it can't be parsed.
    """
    if not raw_prereq or raw_prereq.strip().lower() == "none":
        return None

    prereq_part = find_prereq_boundary(raw_prereq)
    tokens = tokenize(prereq_part)
    groups = parse_to_groups(tokens)

    return ast_to_dict(groups)


def parse_department_prereqs(data: List[dict]) -> List[dict]:
    """
    Take the list of course dicts returned by course_scraper.scrape_department,
    parse each course's "raw_prereq" string, and append the resulting 2-level
    AND/OR tree to that course's "prerequisites" list.
    """
    for course in data:
        raw_prereq = course.get("raw_prereq", "")
        tree = build_prereq_tree(raw_prereq)
        if tree is not None:
            course["prerequisites"].append(tree)

    return data
