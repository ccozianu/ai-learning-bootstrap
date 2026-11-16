import { expect, test } from "@playwright/test";

test("parent OTT dashboard renders kid registration & Romanian curriculum catalog", async ({
  page,
}) => {
  let signedIn = false;
  await page.route("**/api/auth/dev-token", (route) => {
    signedIn = true;
    return route.fulfill({ json: { authenticated: true } });
  });
  await page.route("**/api/me", (route) => {
    if (!signedIn) {
      return route.fulfill({
        status: 401,
        json: { error: "Sign-in required." },
      });
    }
    return route.fulfill({
      json: {
        id: "11111111-1111-4111-8111-111111111111",
        email: "ccozianu@gmail.com",
        username: null,
        displayName: "Parent Owner",
        roles: ["PARENT"],
        accountStatus: "ACTIVE",
        signInTypes: ["DEV_TOKEN"],
        lastSignInType: "DEV_TOKEN",
      },
    });
  });
  await page.route("**/api/parent/dashboard", (route) =>
    route.fulfill({
      json: {
        kids: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            username: "matei_ro",
            displayName: "Matei",
            birthYear: 2016,
            accountStatus: "ACTIVE",
            gdprConsentGrantedAt: new Date().toISOString(),
            gdprConsentWithdrawnAt: null,
            attemptsTotal: 4,
            approvedVersionIds: ["romanian-fundamentals@1.0.0"],
            mastery: [
              {
                id: "ro_pronouns_infinitive",
                title: "Subject Pronouns & Verb Infinitive",
                description: "",
                prerequisiteIds: [],
                unmetPrerequisites: [],
                status: "MASTERED",
                attemptsCount: 2,
                correctCount: 2,
              },
            ],
          },
        ],
        curricula: [
          {
            id: "romanian-fundamentals@1.0.0",
            version: "1.0.0",
            title: "Learn Romanian Part 1 — v1.0.0 (3 Chapters)",
            curriculumTitle: "Learn Romanian Part 1",
            description: "All 3 Romanian AiAsTutor chapters.",
            license: "CC-BY-4.0",
            attribution: "AiAsTutor Romanian Prototype Series",
            series: [
              {
                id: "ro-verbs-ch1",
                orderIndex: 1,
                title: "Chapter 1: Magic Words — Core Romanian Verbs",
                subtitle: "Present, Past & Future",
                description: "",
                lessons: [],
              },
            ],
          },
        ],
      },
    }),
  );

  await page.goto("/?ott=demo-ott-token-only-for-mock-test");
  await expect(page.getByText("Parent Dashboard")).toBeVisible();
  await expect(page.getByText("ccozianu@gmail.com")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Register a Kid Account" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Matei" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Approved: Learn Romanian Part 1/ }),
  ).toBeVisible();
});

test("student studio renders KG map, all 3 chapters, sorting game & diacritics", async ({
  page,
}) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      json: {
        id: "22222222-2222-4222-8222-222222222222",
        email: null,
        username: "matei_ro",
        displayName: "Matei",
        roles: ["KID"],
        accountStatus: "ACTIVE",
        signInTypes: ["PASSWORD"],
        lastSignInType: "PASSWORD",
      },
    }),
  );
  await page.route("**/api/learn/overview", (route) =>
    route.fulfill({
      json: {
        knowledgeGraph: [
          {
            id: "ro_verb_kingdoms_4",
            title: "The 4 Verb Conjugation Kingdoms",
            description: "Classify verbs into Group I–IV.",
            prerequisiteIds: [],
            unmetPrerequisites: [],
            status: "READY",
            attemptsCount: 0,
            correctCount: 0,
          },
        ],
        curricula: [
          {
            versionId: "romanian-fundamentals@1.0.0",
            title: "Learn Romanian Part 1 — v1.0.0 (3 Chapters)",
            description: "Verbs & Numerals",
            attribution: "AiAsTutor Romanian Prototype Series",
            license: "CC-BY-4.0",
            series: [
              {
                id: "ro-verbs-ch2",
                orderIndex: 2,
                slug: "verbs-ch2",
                title: "Chapter 2: The 4 Verb Kingdoms",
                subtitle: "Kingdoms & Group 1",
                description: "",
                knowledgeNodeId: "ro_verb_kingdoms_4",
                lessons: [
                  {
                    id: "ro-v2-kingdoms",
                    orderIndex: 1,
                    slug: "four-verb-kingdoms",
                    title: "The 4 Verb Kingdoms & Sorting Game",
                    kind: "INTERACTIVE_TRAINER",
                    knowledgeNodeId: "ro_verb_kingdoms_4",
                    solvedCount: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    }),
  );
  await page.route("**/api/learn/lessons/ro-v2-kingdoms", (route) =>
    route.fulfill({
      json: {
        id: "ro-v2-kingdoms",
        seriesId: "ro-verbs-ch2",
        seriesTitle: "Chapter 2: The 4 Verb Kingdoms",
        title: "The 4 Verb Kingdoms & Sorting Game",
        kind: "INTERACTIVE_TRAINER",
        knowledgeNodeId: "ro_verb_kingdoms_4",
        contentJson: {
          badge: "Groups Presentation 0",
          hero: "The 4 Verb Kingdoms of Romanian",
          cards: [
            {
              heading: "How to Find a Verb's Kingdom",
              body: "Look at -a, -ea, -e, or -i/-î.",
            },
          ],
        },
        exercises: [
          {
            id: "ex-ch2-kingdom-sort",
            orderIndex: 1,
            exerciseType: "CATEGORY_SORT",
            promptEn: "Sort verbs into Kingdoms",
            promptRoTemplate: "Kingdom Sorting",
            knowledgeNodeId: "ro_verb_kingdoms_4",
            verbs: [{ ro: "a pleca", en: "to leave" }],
          },
        ],
      },
    }),
  );

  await page.goto("/");
  await expect(page.getByText("Romanian Studio")).toBeVisible();
  await expect(page.getByText("KNOWLEDGE DEPENDENCY MAP")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The 4 Verb Kingdoms of Romanian" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /a pleca/ })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
