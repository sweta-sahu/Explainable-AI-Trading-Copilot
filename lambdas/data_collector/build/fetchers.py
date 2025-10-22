import requests
import io

# Fetch CSV price data from Stooq
def fetch_prices_stooq_csv(ticker: str) -> bytes:
    url = f"https://stooq.com/q/d/l/?s={ticker.lower()}.us&i=d"
    response = requests.get(url)
    if response.status_code != 200 or not response.text.strip():
        raise ValueError(f"Failed to fetch Stooq data for {ticker}")
    return response.content

# Fetch latest news from GDELT API
def fetch_gdelt_articles(keyword: str, max_records: int = 25):
    url = (
        "https://api.gdeltproject.org/api/v2/doc/doc?query="
        f"{keyword}&mode=ArtList&format=json"
    )
    response = requests.get(url)
    if response.status_code != 200:
        raise ValueError(f"GDELT API error for {keyword}")
    data = response.json()
    articles = data.get("articles", [])[:max_records]
    cleaned = [
        {
            "seendate": art.get("seendate"),
            "title": art.get("title"),
            "url": art.get("url"),
            "domain": art.get("domain"),
            "lang": art.get("language")
        }
        for art in articles
    ]
    return cleaned
