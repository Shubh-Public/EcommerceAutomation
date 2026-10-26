# AI usage

## 1. I used Cursor agent that is Claude Opus initially to build this repo as this model is good in Thinking and Analysing to create a Initial Project. Playwright + TypeScript, UI and API tests, POM, fixtures, probe the real site before coding APIs. Implement the Playwright MCP was also part of this

## 2. Ask agent to implement the Allure Reporting

## 3. Implemented and also the improvement that Creation of user though api and use in the login flow

## 4. Used to write the AGENTS.md file that defines the rules to make this as Automation agent. When user try to add new cases or update it can be done through prompt only

## 5. For Addition of new testcase mention scenario and steps , ask to gove prompt based on the rules it gives prompt and ask for the implement for new testcase

---

## Where the AI was wrong or improvement (framework code)

## 1. for login case , it creates user through UI and persist the creds and use in login case ,so what i fixed here is create user via api and use that in Login which is faster and saves time and also test the actual testcase

---

## 2. Same HTML shows up on several screens. Rather than paste the same locators into CartPage, CheckoutPage, and so on, we put that UI in a small class under components/ and reuse it from whichever page needs it.
