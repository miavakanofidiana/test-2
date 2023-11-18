const express = require("express");
const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const app = express();

app.get("/", async function (request, reply) {
  console.log("Request received");

  const url = request.query.url;
  const siteKey = request.query.site_key;

  // Check if the URL and site-key are present
  if (!url || !siteKey) {
    reply.status(400).send('Missing "url" or "site-key" parameters.');
    return;
  }

  // Set up Chrome options
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments("--disable-web-security");

  // Launch the browser
  const browser = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(chromeOptions)
    .build();

  const page = await browser.newPage();

  try {
    // Go to the webpage where you want to execute the ReCaptcha code
    await page.goto(url, { timeout: 300000 });
    await page.waitForNavigation({ waitUntil: ["load", "networkidle2"] });

    // Inject the ReCaptcha script into the page
    await page.executeScript(
      async (siteKey) => {
        const script = document.createElement("script");
        script.src = `https://www.google.com/recaptcha/api.js?onload=submit&render=${siteKey}`;
        document.head.appendChild(script);
      },
      siteKey
    );

    // Execute your ReCaptcha code
    const token = await page.executeScript(
      async (siteKey) => {
        return new Promise((resolve, reject) => {
          grecaptcha.ready(async () => {
            try {
              const token = await grecaptcha.execute(siteKey, {
                action: "homepage",
              });
              resolve(token);
            } catch (error) {
              reject(error);
            }
          });
        });
      },
      siteKey
    );

    // Send the response
    const response = {
      url: url,
      site_key: siteKey,
      token: token,
    };
    reply.status(200).json(response);
  } catch (error) {
    console.error("Error:", error);
    reply.status(500).send("Internal Server Error\n\n" + error);
  } finally {
    await browser.quit();
  }
});

// Run the server and report out to the logs
app.listen({ port: process.env.PORT }, function () {
  console.log(`Hey!! Your app is running`);
});
