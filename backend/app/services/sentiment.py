from app.models.feedback import SentimentLabel

POSITIVE_KEYWORDS = [
    "bun", "buna", "buni", "bune",
    "excelent", "excelenta",
    "fantastic", "fantastica",
    "minunat", "minunata",
    "frumos", "frumoasa",
    "util", "utila",
    "interesant", "interesanta",
    "placut", "placuta",
    "recomand",
    "perfect", "perfecta",
    "super",
    "grozav", "grozava",
    "multumit", "multumita",
    "felicitari",
    "deosebit", "deosebita",
    "uimitor", "uimitoare",
    "organizat", "organizata",
]

NEGATIVE_KEYWORDS = [
    "prost", "proasta", "proasti", "proaste",
    "rau", "rea", "rai", "rele",
    "dezastru", "dezastruos",
    "dezamagit", "dezamagita", "dezamagire",
    "plictisitor", "plictisitoare",
    "slab", "slaba",
    "haotic", "haotica",
    "neorganizat", "neorganizata",
    "dezorganizat", "dezorganizata",
    "groaznic", "groaznica",
    "oribil", "oribila",
    "intarziere", "intarziat", "intarziata",
    "nimic",
]


def analyze_sentiment(rating: int, comment: str | None) -> SentimentLabel:
    score = 0
    if rating >= 4:
        score += 1
    elif rating <= 2:
        score -= 1

    if comment:
        text = comment.lower()
        score += sum(1 for word in POSITIVE_KEYWORDS if word in text)
        score -= sum(1 for word in NEGATIVE_KEYWORDS if word in text)

    if score > 0:
        return SentimentLabel.POSITIVE
    if score < 0:
        return SentimentLabel.NEGATIVE
    return SentimentLabel.NEUTRAL
