const express = require("express");
const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core")

const app = express()

app.get("/", async function (request, reply) {
  console.log("Request received");
  
  const url = request.query.url;
  const siteKey = request.query.site_key;

  // Check if the URL and site-key are present
  if (!url || !siteKey) {
    reply.status(400).send('Missing "url" or "site-key" parameters.');
    return;
  }

  // Ensure the browser is ready before processing requests
  /*const browser = await puppeteer.connect({
	browserWSEndpoint: `wss://chrome.browserless.io?token=98036bb5-d4bd-4519-8dd4-dcfe166fbbc3`,
  })*/
  const browser = await puppeteer.launch({
    args: [...chromium.args, "--disable-web-security"],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v110.0.1/chromium-v110.0.1-pack.tar"
      ),
    ignoreHTTPSErrors: true,
    headless: true, // Run headless
    timeout: 0
  });
  const page = await browser.newPage();

  try {
    // Go to the webpage where you want to execute the ReCaptcha code
    await page.goto(url, {timeout: 300000});
    await page.waitForNavigation({waitUntil:["load", "networkidle2"]})

    // Inject the ReCaptcha script into the page
    await page.addScriptTag({ url: "https://www.google.com/recaptcha/api.js?onload=submit&render="+siteKey });

    // Execute your ReCaptcha code
    const token = await page.evaluate(async (siteKey) => {
  try {
    return new Promise((resolve, reject) => {
      grecaptcha.ready(async () => {
        try {
          const token = await grecaptcha.execute(siteKey, { action: "homepage" });
          resolve(token);
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error("Error in grecaptcha.ready:", error);
    throw error; // Ensure the error is propagated
  }
}, siteKey);

    // Send the response
    const response = {
    	url: url, 
    	site_key: siteKey, 
    	token: token
    };
    reply.status(200).json(response);
  } catch (error) {
    console.error("Error:", error);
    reply.status(500).send("Internal Server Error\n\n"+error);
  } finally {
    await browser.close();
  }
});

// Run the server and report out to the logs
app.listen({ port: process.env.PORT}, function () {
  console.log(`Hey!! Your app is running`);
});