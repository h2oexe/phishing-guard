from __future__ import annotations

import re
from html.parser import HTMLParser
from urllib.parse import urlparse

from phishguard.models import ExtractedLink


URL_PATTERN = re.compile(r"https?://[^\s\"'>)]+", re.IGNORECASE)


class LinkHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[ExtractedLink] = []
        self._current_href = ""
        self._current_text: list[str] = []
        self._in_anchor = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        self._in_anchor = True
        self._current_text = []
        for key, value in attrs:
            if key.lower() == "href" and value:
                self._current_href = value
                break

    def handle_data(self, data: str) -> None:
        if self._in_anchor:
            self._current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or not self._in_anchor:
            return
        url = self._current_href.strip()
        if url:
            self.links.append(
                ExtractedLink(
                    url=url,
                    domain=extract_domain(url),
                    display_text=" ".join(part.strip() for part in self._current_text if part.strip()),
                    is_ip=is_ip_host(extract_domain(url)),
                )
            )
        self._current_href = ""
        self._current_text = []
        self._in_anchor = False


def extract_domain(url: str) -> str:
    parsed = urlparse(url)
    return (parsed.hostname or "").lower()


def is_ip_host(host: str) -> bool:
    if not host:
        return False
    parts = host.split(".")
    if len(parts) != 4:
        return False
    return all(part.isdigit() and 0 <= int(part) <= 255 for part in parts)


def parse_links(body_text: str, body_html: str) -> list[ExtractedLink]:
    html_links = parse_html_links(body_html)
    text_links = parse_text_links(body_text)

    seen: set[tuple[str, str]] = set()
    merged: list[ExtractedLink] = []
    for link in html_links + text_links:
        key = (link.url, link.display_text)
        if key in seen:
            continue
        seen.add(key)
        merged.append(link)
    return merged


def parse_html_links(body_html: str) -> list[ExtractedLink]:
    if not body_html.strip():
        return []
    parser = LinkHTMLParser()
    parser.feed(body_html)
    return parser.links


def parse_text_links(body_text: str) -> list[ExtractedLink]:
    links: list[ExtractedLink] = []
    for match in URL_PATTERN.findall(body_text or ""):
        domain = extract_domain(match)
        links.append(
            ExtractedLink(
                url=match,
                domain=domain,
                display_text="",
                is_ip=is_ip_host(domain),
            )
        )
    return links
