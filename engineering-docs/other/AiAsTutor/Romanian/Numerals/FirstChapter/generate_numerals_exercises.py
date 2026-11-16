import random

# Core vocabularies for generation
# Nouns: (singular, plural, gender, en_singular, en_plural)
# Neuter nouns behave like masculine in singular and feminine in plural.
nouns = [
    ("an", "ani", "masculine", "year", "years"),
    ("băiat", "băieți", "masculine", "boy", "boys"),
    ("câine", "câini", "masculine", "dog", "dogs"),
    ("astronaut", "astronauți", "masculine", "astronaut", "astronauts"),
    
    ("fată", "fete", "feminine", "girl", "girls"),
    ("pisică", "pisici", "feminine", "cat", "cats"),
    ("carte", "cărți", "feminine", "book", "books"),
    ("stea", "stele", "feminine", "star", "stars"),
    
    ("măr", "mere", "neuter", "apple", "apples"),
    ("creion", "creioane", "neuter", "pencil", "pencils"),
    ("film", "filme", "neuter", "movie", "movies"),
    ("oraș", "orașe", "neuter", "city", "cities")
]

# Nouns that are common for currency and large numbers
extra_nouns = [
    ("euro", "euro", "masculine", "euro", "euros"),
    ("locuitor", "locuitori", "masculine", "inhabitant", "inhabitants"),
    ("pagină", "pagini", "feminine", "page", "pages")
]

# Pronouns and verbs for variety
pronoun_verbs = [
    {"p_ro": "Eu am", "p_en": "I have"},
    {"p_ro": "Tu ai", "p_en": "You have"},
    {"p_ro": "El are", "p_en": "He has"},
    {"p_ro": "Ea are", "p_en": "She has"},
    {"p_ro": "Noi avem", "p_en": "We have"},
    {"p_ro": "Voi aveți", "p_en": "You all have"},
    {"p_ro": "Ei au", "p_en": "They have"},
    {"p_ro": "Ele au", "p_en": "They have"}
]

# Number-to-text algorithm in Romanian
def num_to_ro(n, gender="masculine"):
    if n == 0:
        return "zero"
        
    units_m = ["", "unu", "doi", "trei", "patru", "cinci", "șase", "șapte", "opt", "nouă"]
    units_f = ["", "una", "două", "trei", "patru", "cinci", "șase", "șapte", "opt", "nouă"]
    
    def get_under_10(val, g):
        return units_m[val] if g == "masculine" else units_f[val]
        
    def get_under_100(val, g):
        if val == 0:
            return ""
        if val < 10:
            return get_under_10(val, g)
        if val == 10:
            return "zece"
        if val == 11:
            return "unsprezece"
        if val == 12:
            return "doisprezece" if g == "masculine" else "douăsprezece"
        if val == 13:
            return "treisprezece"
        if val == 14:
            return "paisprezece"
        if val == 15:
            return "cincisprezece"
        if val == 16:
            return "șaisprezece"
        if val == 17:
            return "șaptesprezece"
        if val == 18:
            return "optsprezece"
        if val == 19:
            return "nouăsprezece"
        
        # 20-99
        t = val // 10
        u = val % 10
        
        ten_words = ["", "", "douăzeci", "treizeci", "patruzeci", "cincizeci", "șaizeci", "șaptezeci", "optzeci", "nouăzeci"]
        ten_word = ten_words[t]
        
        if u == 0:
            return ten_word
        else:
            u_word = get_under_10(u, g)
            return f"{ten_word} și {u_word}"

    def get_under_1000(val, g):
        h = val // 100
        rem = val % 100
        
        h_word = ""
        if h > 0:
            if h == 1:
                h_word = "o sută"
            elif h == 2:
                h_word = "două sute"
            else:
                h_word = f"{units_f[h]} sute"
                
        rem_word = get_under_100(rem, g)
        
        if h_word and rem_word:
            return f"{h_word} {rem_word}"
        elif h_word:
            return h_word
        else:
            return rem_word

    millions = n // 1000000
    thousands = (n % 1000000) // 1000
    remainder = n % 1000
    
    parts = []
    
    if millions > 0:
        if millions == 1:
            parts.append("un milion")
        else:
            m_text = get_under_1000(millions, "feminine")
            if millions >= 20:
                parts.append(f"{m_text} de milioane")
            else:
                parts.append(f"{m_text} milioane")
                
    if thousands > 0:
        if thousands == 1:
            parts.append("o mie")
        else:
            t_text = get_under_1000(thousands, "feminine")
            if thousands >= 20:
                parts.append(f"{t_text} de mii")
            else:
                parts.append(f"{t_text} mii")
                
    if remainder > 0 or not parts:
        parts.append(get_under_1000(remainder, gender))
        
    return " ".join(parts)

# Main modifier function to handle noun agreements
def get_numeral_text(n, gender="masculine"):
    if n == 1:
        return "un" if gender == "masculine" else "o"
    return num_to_ro(n, gender)

# Check if preposition 'de' is required before the noun
def takes_de_preposition(n):
    # Rule: numbers ending in 1-19 (in the last two digits) do not take 'de'.
    # All others (ending in 00, or 20-99) do.
    last_two = n % 100
    if 1 <= last_two <= 19:
        return False
    return True

# Helper to format numbers with commas for English presentation
def format_num(val):
    return f"{val:,}"

# Procedural exercise generator
random.seed(101)  # Fixed seed for reproducibility

exercises = []
used_combinations = set()

# We want a healthy distribution of number types:
# 1-9 (Units): 15
# 10-19 (Teens): 15
# 20-99 (Tens): 20
# 100-999 (Hundreds): 20
# 1000-999999 (Thousands): 20
# 1000000-99000000 (Millions): 10

ranges = [
    (1, 9, 15),
    (10, 19, 15),
    (20, 99, 20),
    (100, 999, 20),
    (1000, 999999, 20),
    (1000000, 50000000, 10)
]

ex_id = 1
for start, end, count in ranges:
    range_exercises = 0
    attempts = 0
    while range_exercises < count and attempts < 1000:
        attempts += 1
        n = random.randint(start, end)
        
        # Pick a random noun context
        if start >= 10000:
            # Large numbers fit better with inhabitants, stars, or pages
            noun_choices = [
                ("locuitor", "locuitori", "masculine", "inhabitant", "inhabitants"),
                ("stea", "stele", "feminine", "star", "stars"),
                ("pagină", "pagini", "feminine", "page", "pages"),
                ("euro", "euro", "masculine", "euro", "euros")
            ]
        else:
            noun_choices = nouns
            
        noun = random.choice(noun_choices)
        singular_ro, plural_ro, ro_gender, singular_en, plural_en = noun
        
        # Resolve copying behavior for neuters
        actual_gender = ro_gender
        if ro_gender == "neuter":
            actual_gender = "masculine" if n == 1 else "feminine"
            
        # Determine noun form
        n_ro = plural_ro if n != 1 else singular_ro
        n_en = plural_en if n != 1 else singular_en
        
        # Select pronoun context
        pv = random.choice(pronoun_verbs)
        
        combo = f"{n}_{noun[0]}_{pv['p_ro']}"
        if combo in used_combinations:
            continue
        used_combinations.add(combo)
        
        # Romanian text representation
        num_text = get_numeral_text(n, actual_gender)
        
        # Preposition 'de'
        target_phrase = num_text
        if n != 1 and takes_de_preposition(n):
            target_phrase = f"{num_text} de"
            
        # Split target phrase into words for precise blank formatting
        target_words = target_phrase.split()
        blanks_html = " ".join(["<span class='blank'></span>" for _ in target_words])
        
        # Generate English and Romanian sentences
        # Special sentence templates for variety
        templates = [
            # 0. Pronoun + Verb + Noun
            {
                "en": f"{pv['p_en']} {format_num(n)} {n_en}.",
                "ro": f"{pv['p_ro']} {blanks_html} ({format_num(n)}) {n_ro}."
            },
            # 1. Existential (There are/is)
            {
                "en": f"There {'is' if n == 1 else 'are'} {format_num(n)} {n_en} here.",
                "ro": f"Sunt {blanks_html} ({format_num(n)}) {n_ro} aici." if n != 1 else f"Este {blanks_html} ({format_num(n)}) {n_ro} aici."
            },
            # 2. Specific count phrases
            {
                "en": f"We see {format_num(n)} {n_en} in the yard.",
                "ro": f"Noi vedem {blanks_html} ({format_num(n)}) {n_ro} în curte."
            }
        ]
        
        # Choose template based on noun compatibility
        if singular_ro in ["an", "astronaut", "locuitor"]:
            # e.g., "He is 10 years old" / "The city has 10 inhabitants"
            if singular_ro == "an":
                en_sentence = f"{pv['p_en']} {format_num(n)} {n_en} old." if pv['p_en'] not in ["I have", "You have", "We have", "You all have", "They have"] else f"{pv['p_en']} {format_num(n)} {n_en}."
                ro_sentence = f"{pv['p_ro']} {blanks_html} ({format_num(n)}) {n_ro}."
            elif singular_ro == "locuitor":
                en_sentence = f"The city has {format_num(n)} {n_en}."
                ro_sentence = f"Orașul are {blanks_html} ({format_num(n)}) {n_ro}."
            else:
                en_sentence = f"We see {format_num(n)} {n_en}."
                ro_sentence = f"Noi vedem {blanks_html} ({format_num(n)}) {n_ro}."
        else:
            t = random.choice(templates)
            en_sentence = t["en"]
            ro_sentence = t["ro"]
            
        exercises.append({
            "en": en_sentence,
            "ro": ro_sentence,
            "solution": target_phrase
        })
        range_exercises += 1
        ex_id += 1

# Shuffle exercises for a mixed workload
random.shuffle(exercises)

# Now, let's build the HTML content
html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Romanian Numerals: Practice Time!</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');

        :root {
            --bg-gradient: linear-gradient(135deg, #fff5eb 0%, #e0f2fe 100%);
            --card-bg: rgba(255, 255, 255, 0.95);
            --text-main: #2d3436;
            --border-color: #ffe8d6;
        }

        body {
            font-family: 'Nunito', sans-serif;
            margin: 0;
            padding: 0;
            background: var(--bg-gradient);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        header {
            background: linear-gradient(120deg, #ff9f43 0%, #ff6b6b 100%);
            width: 100%;
            padding: 2.5rem 1rem;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-bottom-left-radius: 30px;
            border-bottom-right-radius: 30px;
            margin-bottom: 2rem;
        }

        h1 {
            font-size: 2.6rem;
            color: #fff;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.15);
            margin: 0;
        }

        .container {
            max-width: 1200px;
            width: 95%;
            margin: 0 auto;
            padding-bottom: 4rem;
        }

        .exercises-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
            gap: 1.5rem;
        }

        .exercise-card {
            background: var(--card-bg);
            border-radius: 18px;
            padding: 1.3rem;
            box-shadow: 0 6px 18px rgba(0,0,0,0.04);
            border: 2px solid var(--border-color);
            display: flex;
            align-items: center;
            transition: transform 0.2s;
        }

        .exercise-card:hover {
            transform: translateY(-2px);
            border-color: #ff9f43;
        }

        .ex-number {
            background: #ff6b6b;
            color: white;
            font-size: 1.25rem;
            font-weight: bold;
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            margin-right: 18px;
            flex-shrink: 0;
            box-shadow: 0 3px 8px rgba(255, 107, 107, 0.3);
        }

        .ex-content {
            flex-grow: 1;
        }

        .en-sentence {
            font-size: 1.15rem;
            color: #57606f;
            margin-bottom: 8px;
            font-style: italic;
        }

        .ro-sentence {
            font-size: 1.35rem;
            font-weight: bold;
            color: #2f3542;
        }

        .blank {
            display: inline-block;
            min-width: 65px;
            border-bottom: 3px solid #ff9f43;
            margin: 0 4px;
            vertical-align: bottom;
        }

        /* --- PRINT CSS --- */
        @media print {
            @page {
                size: A4 portrait;
                margin: 10mm;
            }

            body {
                background: white;
            }

            header {
                background: none;
                box-shadow: none;
                border-bottom: 2px solid #ccc;
                padding: 0 0 1rem 0;
                margin-bottom: 1.5rem;
            }

            h1 {
                color: black;
                text-shadow: none;
            }

            .container {
                max-width: 100%;
                width: 100%;
                padding-bottom: 0;
            }

            .exercises-grid {
                grid-template-columns: 1fr 1fr;
                gap: 5mm;
            }

            .exercise-card {
                background: white;
                border: 1px solid #ccc;
                box-shadow: none;
                page-break-inside: avoid;
                padding: 10px;
            }

            .ex-number {
                background: transparent;
                color: black;
                border: 2px solid black;
                box-shadow: none;
            }

            .en-sentence { color: #555; }
            .ro-sentence { color: black; }
            .blank { border-bottom: 1.5px solid black; }
        }
    </style>
</head>
<body>

    <header>
        <h1>✏️ Counting Stars: Romanian Numerals Worksheet!</h1>
        <p style="color: white; font-size: 1.25rem; font-weight: bold; margin-top: 10px;">Fill in the blanks with the correct numeral forms.</p>
    </header>

    <div class="container">
        <div class="exercises-grid">
"""

for idx, ex in enumerate(exercises, 1):
    html_content += f"""
            <div class="exercise-card">
                <div class="ex-number">{idx}</div>
                <div class="ex-content">
                    <div class="en-sentence">{ex['en']}</div>
                    <div class="ro-sentence">{ex['ro']}</div>
                </div>
            </div>"""

html_content += """
        </div>
    </div>
</body>
</html>
"""

# Write to file
with open("Exercises_Numerals.html", "w", encoding="utf-8") as f:
    f.write(html_content)

# Optional: Write solution manifest for validation
import json
with open("exercises_numerals_solutions.json", "w", encoding="utf-8") as f:
    json.dump(exercises, f, ensure_ascii=False, indent=4)

print("Exercises_Numerals.html generated successfully.")
