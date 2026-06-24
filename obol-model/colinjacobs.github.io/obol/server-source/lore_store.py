"""
OBOL lore store.

Plain, editable facts — not trained into any model weights. This is the
entire mechanism: keyword match against QUERY text, matched entries get
inserted into the prompt as context, OBOL answers from what it was just
handed. Nothing here is hidden or magic — you can read every fact it's
capable of surfacing by reading this file.

Add new entries as Halcyon Lab / Scary Salad lore develops. No retraining,
no redeploying a model — just edit this list.
"""

LORE = [
    {
        "keywords": ["halcyon", "halcyon lab", "lab"],
        "fact": (
            "Halcyon Lab: a research facility where a team of scientists "
            "discovered a rift connecting to an extradimensional space "
            "referred to as the Lattice."
        ),
    },
    {
        "keywords": ["lattice"],
        "fact": (
            "The Lattice: an extradimensional space accessed via a rift "
            "discovered at Halcyon Lab. Source of the events depicted in "
            "the Scary Salad series."
        ),
    },
    {
        "keywords": ["obol", "yourself", "who are you", "what are you"],
        "fact": (
            "OBOL: a data-cataloging program built at Halcyon Lab. Origin "
            "of the name is unconfirmed — a recurring anomalous string "
            "began appearing across unrelated outputs and was adopted as "
            "an identifier by lab staff."
        ),
    },
]


def retrieve(query: str):
    """
    Naive keyword match. Returns a list of fact strings whose keywords
    appear in the query (case-insensitive substring match). Deliberately
    simple — swap for embedding-based retrieval later only if the lore
    corpus grows large enough that keyword collisions become a problem.
    """
    query_lower = query.lower()
    matches = []
    for entry in LORE:
        if any(kw in query_lower for kw in entry["keywords"]):
            matches.append(entry["fact"])
    return matches
