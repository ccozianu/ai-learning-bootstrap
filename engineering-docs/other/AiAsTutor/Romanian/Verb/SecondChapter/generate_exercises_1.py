import random

verbs = [
    {"inf": "pleca", "part": "plecat", 
     "pres": ["plec", "pleci", "pleacă", "plecăm", "plecați", "pleacă"],
     "en_pres": ["leave", "leave", "leaves", "leave", "leave", "leave"], 
     "en_inf": "leave", "en_part": "left",
     "complements": [("acasă", "home"), ("la mare", "for the seaside"), ("repede", "quickly"), ("de la școală", "from school")]},
    {"inf": "mânca", "part": "mâncat", 
     "pres": ["mănânc", "mănânci", "mănâncă", "mâncăm", "mâncați", "mănâncă"], 
     "en_pres": ["eat", "eat", "eats", "eat", "eat", "eat"], 
     "en_inf": "eat", "en_part": "eaten",
     "complements": [("un măr", "an apple"), ("pâine", "bread"), ("supă", "soup"), ("pizza", "pizza")]},
    {"inf": "cânta", "part": "cântat", 
     "pres": ["cânt", "cânți", "cântă", "cântăm", "cântați", "cântă"], 
     "en_pres": ["sing", "sing", "sings", "sing", "sing", "sing"], 
     "en_inf": "sing", "en_part": "sung",
     "complements": [("frumos", "beautifully"), ("un cântec", "a song"), ("la pian", "the piano"), ("bine", "well")]},
    {"inf": "juca", "part": "jucat", 
     "pres": ["joc", "joci", "joacă", "jucăm", "jucați", "joacă"], 
     "en_pres": ["play", "play", "plays", "play", "play", "play"], 
     "en_inf": "play", "en_part": "played",
     "complements": [("fotbal", "soccer"), ("tenis", "tennis"), ("în curte", "in the yard"), ("un joc", "a game")]},
    {"inf": "lucra", "part": "lucrat", 
     "pres": ["lucrez", "lucrezi", "lucrează", "lucrăm", "lucrați", "lucrează"], 
     "en_pres": ["work", "work", "works", "work", "work", "work"], 
     "en_inf": "work", "en_part": "worked",
     "complements": [("mult", "a lot"), ("la calculator", "on the computer"), ("în grădină", "in the garden"), ("cu tata", "with dad")]},
    {"inf": "asculta", "part": "ascultat", 
     "pres": ["ascult", "asculți", "ascultă", "ascultăm", "ascultați", "ascultă"], 
     "en_pres": ["listen", "listen", "listens", "listen", "listen", "listen"], 
     "en_inf": "listen", "en_part": "listened",
     "complements": [("muzică", "to music"), ("la radio", "to the radio"), ("pe mama", "to mom"), ("o poveste", "to a story")]},
    {"inf": "cumpăra", "part": "cumpărat", 
     "pres": ["cumpăr", "cumperi", "cumpără", "cumpărăm", "cumpărați", "cumpără"], 
     "en_pres": ["buy", "buy", "buys", "buy", "buy", "buy"], 
     "en_inf": "buy", "en_part": "bought",
     "complements": [("mere", "apples"), ("o jucărie", "a toy"), ("pâine", "bread"), ("o carte", "a book")]},
    {"inf": "dansa", "part": "dansat", 
     "pres": ["dansez", "dansezi", "dansează", "dansăm", "dansați", "dansează"], 
     "en_pres": ["dance", "dance", "dances", "dance", "dance", "dance"], 
     "en_inf": "dance", "en_part": "danced",
     "complements": [("frumos", "beautifully"), ("la petrecere", "at the party"), ("mult", "a lot"), ("cu mine", "with me")]},
    {"inf": "întreba", "part": "întrebat", 
     "pres": ["întreb", "întrebi", "întreabă", "întrebăm", "întrebați", "întreabă"], 
     "en_pres": ["ask", "ask", "asks", "ask", "ask", "ask"], 
     "en_inf": "ask", "en_part": "asked",
     "complements": [("ceva", "something"), ("o întrebare", "a question"), ("pe tata", "dad"), ("mereu", "always")]},
    {"inf": "chema", "part": "chemat", 
     "pres": ["chem", "chemi", "cheamă", "chemăm", "chemați", "cheamă"], 
     "en_pres": ["call", "call", "calls", "call", "call", "call"], 
     "en_inf": "call", "en_part": "called",
     "complements": [("un prieten", "a friend"), ("câinele", "the dog"), ("pe mama", "mom"), ("pe Andrei", "Andrei")]}
]

pronouns_ro = ["Eu", "Tu", "El", "Ea", "Noi", "Voi", "Ei", "Ele"]
pronouns_en = ["I", "You", "He", "She", "We", "You all", "They", "They"]
pronoun_idx_map = [0, 1, 2, 2, 3, 4, 5, 5]

random.seed(42) # For reproducible output

exercises = []
used_combinations = set()

while len(exercises) < 100:
    v = random.choice(verbs)
    p_idx = random.randint(0, 7)
    c = random.choice(v["complements"])
    tense = random.choice(["pres", "past", "fut"])
    
    combo = f'{v["inf"]}_{p_idx}_{c[0]}_{tense}'
    if combo in used_combinations:
        continue
    used_combinations.add(combo)
    
    p_ro = pronouns_ro[p_idx]
    p_en = pronouns_en[p_idx]
    c_idx = pronoun_idx_map[p_idx]
    
    if tense == "pres":
        en_sentence = f"{p_en} {v['en_pres'][c_idx]} {c[1]}."
        ro_sentence = f"{p_ro} <span class='blank'></span> {c[0]}."
    elif tense == "past":
        en_sentence = f"{p_en} have {v['en_part']} {c[1]}." if p_en not in ["He", "She"] else f"{p_en} has {v['en_part']} {c[1]}."
        ro_sentence = f"{p_ro} <span class='blank'></span> <span class='blank'></span> {c[0]}."
    else: # fut
        en_sentence = f"{p_en} will {v['en_inf']} {c[1]}."
        ro_sentence = f"{p_ro} <span class='blank'></span> <span class='blank'></span> {c[0]}."
        
    exercises.append({
        "en": en_sentence,
        "ro": ro_sentence
    })

# Now generate HTML
html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Romanian Verbs: Group 1 Practice!</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');

        :root {
            --bg-gradient: linear-gradient(135deg, #fff5f5 0%, #ffe3e3 100%);
            --card-bg: rgba(255, 255, 255, 0.95);
            --text-main: #2d3436;
            --border-color: #ffd8d8;
            --highlight-color: #ff7675;
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
            background: linear-gradient(120deg, #ff7675 0%, #ff9f43 100%);
            width: 100%;
            padding: 2rem 1rem;
            text-align: center;
            box-shadow: 0 4px 15px rgba(255, 118, 117, 0.2);
            border-bottom-left-radius: 30px;
            border-bottom-right-radius: 30px;
            margin-bottom: 2rem;
        }

        h1 {
            font-size: 2.5rem;
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
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 1.5rem;
        }

        .exercise-card {
            background: var(--card-bg);
            border-radius: 15px;
            padding: 1.2rem;
            box-shadow: 0 5px 15px rgba(255, 118, 117, 0.03);
            border: 2px solid var(--border-color);
            display: flex;
            align-items: center;
        }

        .ex-number {
            background: var(--highlight-color);
            color: white;
            font-size: 1.2rem;
            font-weight: bold;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            margin-right: 15px;
            flex-shrink: 0;
        }

        .ex-content {
            flex-grow: 1;
        }

        .en-sentence {
            font-size: 1.1rem;
            color: #636e72;
            margin-bottom: 8px;
            font-style: italic;
        }

        .ro-sentence {
            font-size: 1.3rem;
            font-weight: bold;
            color: #2d3436;
        }

        .blank {
            display: inline-block;
            min-width: 50px;
            border-bottom: 2px solid var(--highlight-color);
            margin: 0 5px;
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
                margin-bottom: 1rem;
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
                margin-bottom: 0;
            }

            .ex-number {
                background: transparent;
                color: black;
                border: 2px solid black;
            }

            .en-sentence { color: #555; }
            .ro-sentence { color: black; }
            .blank { border-bottom: 1px solid black; }
        }
    </style>
</head>
<body>

    <header>
        <h1>✏️ Group 1 Verbs: Practice Sheet!</h1>
        <p style="color: white; font-size: 1.2rem; font-weight: bold; margin-top: 10px;">Fill in the blanks with the correct Conjugation I Romanian verb forms.</p>
    </header>

    <div class="container">
        <div class="exercises-grid">
"""

for i, ex in enumerate(exercises, 1):
    html_content += f'''
            <div class="exercise-card">
                <div class="ex-number">{i}</div>
                <div class="ex-content">
                    <div class="en-sentence">{ex['en']}</div>
                    <div class="ro-sentence">{ex['ro']}</div>
                </div>
            </div>'''

html_content += """
        </div>
    </div>
</body>
</html>
"""

with open("Exercises_1.html", "w") as f:
    f.write(html_content)

print("Generated Exercises_1.html successfully.")
