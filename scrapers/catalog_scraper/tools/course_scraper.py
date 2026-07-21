

import copy
import re

import httpx
from bs4 import BeautifulSoup

BLANK_URL = "https://catalog.ucsd.edu/courses/{}.html"
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/144.0.0.0 Safari/537.36"
    )
}

JSON_TEMPLATE = {
    "name": "",
    "code": "",
    "raw_prereq": "",
    "prerequisites": [],
    "offered_this_qtr": False,
}

# Department pages mark where the prerequisite text starts with a
# "Prerequisites:" label, but the markup wrapping that label is inconsistent
# both across and within department pages - <strong class="italic"><em>,
# bare <strong><em><em>, or even the label and its trailing colon split
# across separate sibling tags (see ECON). Match on the flattened text
# instead of depending on a specific tag/class shape. Capital "P" and the
# colon are required so this doesn't match lowercase in-sentence mentions
# like "...may enroll with consent of instructor" -> "listed prerequisites".
PREREQ_LABEL_RE = re.compile(r"Prerequisites?:")


def scrape_department(code, blank_url=BLANK_URL, headers=DEFAULT_HEADERS):
    data = []

    response_html = fetch_html(code, blank_url=blank_url, headers=headers)
    soup = BeautifulSoup(response_html, "html.parser")
    print(f"Scraping {code}...")

    for name_el in soup.find_all("p", class_="course-name"):
        name_text = name_el.get_text(strip=True)
        parts = name_text.split(".")

        course_data = copy.deepcopy(JSON_TEMPLATE)
        course_data["code"] = parts[0]
        course_data["name"] = parts[1].split(" (")[0].strip() if len(parts) > 1 else ""

        description_el = find_description(name_el)
        if description_el is not None:
            course_data["raw_prereq"] = extract_prereq(description_el)

        data.append(course_data)

    return data


def find_description(name_el):
    """
    Find the <p> holding a course's description. It's normally the very
    next sibling and usually has class="course-descriptions", but some
    department pages (e.g. DSC) drop that class from certain paragraphs, so
    this doesn't filter on it. "anchor-parent" placeholders (just an <a>
    used for in-page links) are skipped since they can appear before the
    real description too.
    """
    sibling = name_el.find_next_sibling("p")
    while sibling is not None and "anchor-parent" in sibling.get_attribute_list("class"):
        sibling = sibling.find_next_sibling("p")

    if sibling is not None and "course-name" not in sibling.get_attribute_list("class"):
        return sibling
    return None


def extract_prereq(description_el):
    text = description_el.get_text()
    match = PREREQ_LABEL_RE.search(text)
    if not match:
        return ""
    return text[match.end():].strip()

def fetch_html(code, blank_url=BLANK_URL, headers=DEFAULT_HEADERS):
    url = blank_url.format(code)
    response = httpx.get(url, headers=headers)
    return response.text

