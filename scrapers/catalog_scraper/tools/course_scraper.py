

import copy

import httpx
from bs4 import BeautifulSoup
import pandas as pd

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


def scrape_department(code, blank_url=BLANK_URL, headers=DEFAULT_HEADERS):
    data = []

    response_html = fetch_html(code, blank_url=blank_url, headers=headers)
    soup = BeautifulSoup(response_html, "html.parser")
    print(f"Scraping {code}...")

    elements = soup.find_all(class_=["course-name", "course-descriptions"])

    course_data = None
    for el in elements:
        classes = el.get_attribute_list("class")

        if "course-name" in classes:
            # Starting a new course - flush the one we were building.
            if course_data is not None:
                data.append(course_data)

            name_text = el.get_text(strip=True)
            parts = name_text.split(".")

            course_data = copy.deepcopy(JSON_TEMPLATE)
            course_data["code"] = parts[0]
            course_data["name"] = parts[1].split(" (")[0].strip() if len(parts) > 1 else ""

        elif "course-descriptions" in classes:
            if course_data is None:
                continue

            strong = el.find("strong", class_="italic")
            if strong:
                prereq = "".join(
                    str(x).strip()
                    for x in strong.next_siblings
                    if str(x).strip()
                )
                course_data["raw_prereq"] = prereq

    # The last course has no following course-name to trigger its flush.
    if course_data is not None:
        data.append(course_data)

    return data

def fetch_html(code, blank_url=BLANK_URL, headers=DEFAULT_HEADERS):
    url = blank_url.format(code)
    response = httpx.get(url, headers=headers)
    return response.text

