import random
import json

verbs = [
    {"inf": "fi", "part": "fost", 
     "pres": ["sunt", "ești", "este", "suntem", "sunteți", "sunt"],
     "en_pres": ["am", "are", "is", "are", "are", "are"], 
     "en_inf": "be", "en_part": "been",
     "complements": [("aici", "here"), ("acasă", "at home"), ("fericit", "happy"), ("absent la școală", "absent at school")]},
    {"inf": "avea", "part": "avut", 
     "pres": ["am", "ai", "are", "avem", "aveți", "au"], 
     "en_pres": ["have", "have", "has", "have", "have", "have"], 
     "en_inf": "have", "en_part": "had",
     "complements": [("un câine", "a dog"), ("timp", "time"), ("o mașină", "a car"), ("o idee", "an idea")]},
    {"inf": "vrea", "part": "vrut", 
     "pres": ["vreau", "vrei", "vrea", "vrem", "vreți", "vor"], 
     "en_pres": ["want", "want", "wants", "want", "want", "want"], 
     "en_inf": "want", "en_part": "wanted",
     "complements": [("apă", "water"), ("un măr", "an apple"), ("mai mult", "more")]},
    {"inf": "merge", "part": "mers", 
     "pres": ["merg", "mergi", "merge", "mergem", "mergeți", "merg"], 
     "en_pres": ["go", "go", "goes", "go", "go", "go"], 
     "en_inf": "go", "en_part": "gone",
     "complements": [("la școală", "to school"), ("în parc", "to the park"), ("repede", "fast"), ("acolo", "there")]},
    {"inf": "pleca", "part": "plecat", 
     "pres": ["plec", "pleci", "pleacă", "plecăm", "plecați", "pleacă"], 
     "en_pres": ["leave", "leave", "leaves", "leave", "leave", "leave"], 
     "en_inf": "leave", "en_part": "left",
     "complements": [("acasă", "home"), ("la mare", "for the seaside"), ("acum", "now"), ("mâine", "tomorrow")]},
    {"inf": "face", "part": "făcut", 
     "pres": ["fac", "faci", "face", "facem", "faceți", "fac"], 
     "en_pres": ["do", "do", "does", "do", "do", "do"], 
     "en_inf": "do", "en_part": "done",
     "complements": [("bine", "well"), ("temele", "the homework"), ("o prăjitură", "a cake"), ("gălăgie", "noise")]},
    {"inf": "fugi", "part": "fugit", 
     "pres": ["fug", "fugi", "fuge", "fugim", "fugiți", "fug"], 
     "en_pres": ["run", "run", "runs", "run", "run", "run"], 
     "en_inf": "run", "en_part": "run",
     "complements": [("repede", "fast"), ("în curte", "in the yard"), ("departe", "far away"), ("tare", "hard")]},
    {"inf": "putea", "part": "putut", 
     "pres": ["pot", "poți", "poate", "putem", "puteți", "pot"], 
     "en_pres": ["can", "can", "can", "can", "can", "can"], 
     "en_inf": "be able to", "en_part": "been able to",
     "complements": [("citi", "read"), ("veni", "come"), ("ajuta", "help"), ("vedea", "see")]},
    {"inf": "vorbi", "part": "vorbit", 
     "pres": ["vorbesc", "vorbești", "vorbește", "vorbim", "vorbiți", "vorbesc"], 
     "en_pres": ["speak", "speak", "speaks", "speak", "speak", "speak"], 
     "en_inf": "speak", "en_part": "spoken",
     "complements": [("engleză", "English"), ("tare", "loudly"), ("mult", "a lot"), ("cu mama", "with mom")]},
    {"inf": "scrie", "part": "scris", 
     "pres": ["scriu", "scrii", "scrie", "scriem", "scrieți", "scriu"], 
     "en_pres": ["write", "write", "writes", "write", "write", "write"], 
     "en_inf": "write", "en_part": "written",
     "complements": [("o carte", "a book"), ("o scrisoare", "a letter"), ("frumos", "beautifully"), ("pe tablă", "on the board")]},
    {"inf": "citi", "part": "citit", 
     "pres": ["citesc", "citești", "citește", "citim", "citiți", "citesc"], 
     "en_pres": ["read", "read", "reads", "read", "read", "read"], 
     "en_inf": "read", "en_part": "read",
     "complements": [("o poveste", "a story"), ("o carte", "a book"), ("seara", "in the evening"), ("bine", "well")]},
    {"inf": "mânca", "part": "mâncat", 
     "pres": ["mănânc", "mănânci", "mănâncă", "mâncăm", "mâncați", "mănâncă"], 
     "en_pres": ["eat", "eat", "eats", "eat", "eat", "eat"], 
     "en_inf": "eat", "en_part": "eaten",
     "complements": [("un măr", "an apple"), ("pâine", "bread"), ("supă", "soup"), ("pizza", "pizza")]},
    {"inf": "bea", "part": "băut", 
     "pres": ["beau", "bei", "bea", "bem", "beți", "beau"], 
     "en_pres": ["drink", "drink", "drinks", "drink", "drink", "drink"], 
     "en_inf": "drink", "en_part": "drunk",
     "complements": [("apă", "water"), ("lapte", "milk"), ("suc", "juice"), ("ceai", "tea")]},
    {"inf": "veni", "part": "venit", 
     "pres": ["vin", "vii", "vine", "venim", "veniți", "vin"], 
     "en_pres": ["come", "come", "comes", "come", "come", "come"], 
     "en_inf": "come", "en_part": "come",
     "complements": [("aici", "here"), ("mâine", "tomorrow"), ("acasă", "home"), ("la petrecere", "to the party")]},
    {"inf": "ști", "part": "știut", 
     "pres": ["știu", "știi", "știe", "știm", "știți", "știu"], 
     "en_pres": ["know", "know", "knows", "know", "know", "know"], 
     "en_inf": "know", "en_part": "known",
     "complements": [("răspunsul", "the answer"), ("bine", "well"), ("tot", "everything"), ("matematică", "math")]},
    {"inf": "vedea", "part": "văzut", 
     "pres": ["văd", "vezi", "vede", "vedem", "vedeți", "văd"], 
     "en_pres": ["see", "see", "sees", "see", "see", "see"], 
     "en_inf": "see", "en_part": "seen",
     "complements": [("o pasăre", "a bird"), ("bine", "well"), ("cerul", "the sky"), ("un film", "a movie")]}
]

pronouns_ro = ["Eu", "Tu", "El", "Ea", "Noi", "Voi", "Ei", "Ele"]
pronouns_en = ["I", "You", "He", "She", "We", "You all", "They", "They"]
pronoun_idx_map = [0, 1, 2, 2, 3, 4, 5, 5]

past_to_be_en = ["was", "were", "was", "was", "were", "were", "were", "were"]

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
        if v["inf"] == "putea":
            en_sentence = f"{p_en} can {c[1]}."
        else:
            en_sentence = f"{p_en} {v['en_pres'][c_idx]} {c[1]}."
        ro_sentence = f"{p_ro} <span class='blank'></span> {c[0]}."
        answer = v["pres"][c_idx]
    elif tense == "past":
        if v["inf"] == "fi":
            en_sentence = f"{p_en} {past_to_be_en[p_idx]} {c[1]}."
        elif v["inf"] == "putea":
            en_sentence = f"{p_en} could {c[1]}."
        else:
            en_sentence = f"{p_en} have {v['en_part']} {c[1]}." if p_en not in ["He", "She"] else f"{p_en} has {v['en_part']} {c[1]}."
            
        ro_sentence = f"{p_ro} <span class='blank'></span> <span class='blank'></span> {c[0]}."
        answer = f"am/ai/a/am/ati/au {v['part']}" # simplification
    else: # fut
        if v["inf"] == "putea":
            en_sentence = f"{p_en} will be able to {c[1]}."
        else:
            en_sentence = f"{p_en} will {v['en_inf']} {c[1]}."
        ro_sentence = f"{p_ro} <span class='blank'></span> <span class='blank'></span> {c[0]}."
        answer = f"voi/vei/va/vom/veti/vor {v['inf']}"
        
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
    <title>Romanian Verbs: Time to Practice!</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap');

        :root {
            --bg-gradient: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
            --card-bg: rgba(255, 255, 255, 0.95);
            --text-main: #2d3436;
            --border-color: #dfe6e9;
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
            background: linear-gradient(120deg, #a18cd1 0%, #fbc2eb 100%);
            width: 100%;
            padding: 2rem 1rem;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            border-bottom-left-radius: 30px;
            border-bottom-right-radius: 30px;
            margin-bottom: 2rem;
        }

        h1 {
            font-size: 2.5rem;
            color: #fff;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
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
            box-shadow: 0 5px 15px rgba(0,0,0,0.05);
            border: 2px solid var(--border-color);
            display: flex;
            align-items: center;
        }

        .ex-number {
            background: #a18cd1;
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
            border-bottom: 2px solid #0984e3;
            margin: 0 5px;
        }

        /* --- PRINT CSS --- */
        @media print {
            @page {
                size: A4 portrait; /* Usually worksheets are portrait, but A4 works */
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
                grid-template-columns: 1fr 1fr; /* 2 columns for print */
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
        <h1>✏️ Fill in the Blanks!</h1>
        <p style="color: white; font-size: 1.2rem; font-weight: bold; margin-top: 10px;">Translate into Romanian using the correct verb forms.</p>
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
